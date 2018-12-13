import * as AWS from 'aws-sdk'
import * as mime from 'mime-types'
import * as path from 'path'

import {lazyCreateCertificate} from './acm'
import {lazyCreateDistributionForFQDN} from './cloudfront'
import {
  getHostedZoneForRootDomain,
  upsertARecordToCloudFront,
} from './route53'
import {lazyCreateSPABucket, uploadFiles} from './s3'
import {getAllPaths} from './utils'

/*
 * This file should be responsible for deploying a site to aws.
 *
 * IMPORTANT: Need to create route53 hosted zone manually.
 *
 * Arguments
 * awsAccessKeyId: awsAccessKeyId
 * awsSecretAccessKey: awsSecretAccessKey
 * source: folder containing static site assets
 * hostname: deploy site to this hostname, you must own the domain
 *
 * This first step should only happen one time for every new hostname.
 * 1. Lazy create AWS resources
 *    - acm certificate
 *        - lazily create certificate, use DNS validation
 *        - check certificate if it's pending
 *        - lazily add dns validation to route53
 *    - s3
 *        - lazily create bucket for hostname, with static site hosting settings
 *    - cloudfront
 *        - lazily create distribution for hostname, using certificate arn from
 *        (a)
 *    - route53 a record
 *        - lazily create record to point to cloudfront distribution
 * 2. Upload source to s3
 * 3. Invalidate cloudfront distribution
 */

/**
 * A FQDN can be broken down into hostname + domain.
 *
 * Hostname:                            foo
 * Domain:                              example.com
 * FQDN(Fully Qualified Domain Name):   foo.example.com
 */
export function parseFqdn(
  fqdn: string,
): {
  hostname: string | undefined
  domain: string | undefined
  rootDomain: string | undefined
} {
  const matches = fqdn.match(
    /^(([A-Za-z0-9]+)\.)?(([A-Za-z0-9]+\.)+([A-Za-z0-9-]+)$)/,
  )

  return {
    hostname: matches ? matches[2] : undefined,
    domain: matches ? matches[3] : undefined,
    rootDomain: matches ? matches[4] + matches[5] : undefined,
  }
}

/**
 * Replicate matching logic of a wildcard certificate
 * https://en.wikipedia.org/wiki/Wildcard_certificate
 * Only one level of subdomains (eg. foo.bar.example.com is not valid)
 * Naked URL is also valid (eg. example.com)
 */
export function matchDomain(domain: string, match: string): boolean {
  return new RegExp(
    domain.replace('*.', '^([a-zA-Z0-9-_]+.)?').replace('.', '\\.'),
  ).test(match)
}

/**
 * Use DNS validation for requested domain name. Try to use a reasonable domain
 * name not the hostname, if requesting for foo.bar.example.com try request a
 * certifiate for *.bar.example.com instead so in the future bar.bar.example.com
 * would not have to request for another certificate.
 */
async function requestAndVerifyCertificate({
  certificateArn,
  hostedZoneId,
}: {
  certificateArn: string
  hostedZoneId: string
}) {
  const route53 = new AWS.Route53()
  const acm = new AWS.ACM()

  const certificateDescription = await acm
    .describeCertificate({CertificateArn: certificateArn})
    .promise()
  if (!certificateDescription.Certificate) {
    throw new Error("Certificate description does not have a 'Certificate'")
  }
  if (!certificateDescription.Certificate.DomainValidationOptions) {
    throw new Error(
      "Certificate description does not have a 'Certificate.DomainValidationOptions'",
    )
  }

  const changes = certificateDescription.Certificate.DomainValidationOptions.map(
    domainValidation => {
      if (!domainValidation.ResourceRecord) {
        throw new Error("DomainValidationOptions is missing 'ResourceRecord'")
      }
      return {
        Action: 'UPSERT',
        ResourceRecordSet: {
          Name: domainValidation.ResourceRecord.Name,
          Type: domainValidation.ResourceRecord.Type,
          ResourceRecords: [
            {
              Value: domainValidation.ResourceRecord.Value,
            },
          ],
          TTL: 60,
        },
      }
    },
  )

  return route53
    .changeResourceRecordSets({
      ChangeBatch: {
        Changes: changes,
      },
      HostedZoneId: hostedZoneId,
    })
    .promise()
}

export default async function deploy({
  awsAccessKeyId,
  awsSecretAccessKey,
  awsRegion,
  awsEndpoint,
  fqdn,
  source,
}: {
  awsAccessKeyId?: string
  awsSecretAccessKey?: string
  awsRegion?: string
  awsEndpoint?: string
  fqdn: string
  source: string
}) {
  if (awsAccessKeyId && awsSecretAccessKey && awsRegion) {
    // Initialize the aws sdk with config values
    AWS.config.update({
      accessKeyId: awsAccessKeyId,
      region: awsRegion,
      secretAccessKey: awsSecretAccessKey,
      ...(awsEndpoint
        ? {
          endpoint: awsEndpoint,
          s3ForcePathStyle: true,
        }
        : {}),
    })
  }
  const files = getAllPaths(source).map(file => ({
    path: file,
    type: mime.lookup(file) || '',
    key: path.relative(source, file),
  }))

  // "domain" is the immediate parent of the FQDN, this is important because ssl
  // certificates only allow * to match one subdomain, that means if the FQDN is
  // foo.bar.example.com a certificate signed for *.example.com does not handle
  // it.
  const {domain, hostname, rootDomain} = parseFqdn(fqdn)
  if (!rootDomain) {
    throw new Error(`Could not parse rootDomain from given fqdn "${fqdn}"`)
  }
  if (!domain) {
    throw new Error(`Could not parse domain from given fqdn "${fqdn}"`)
  }

  // Registering a domain name through aws will automatically create a hosted
  // zone, this step is manual and requires user to do this via the aws console.
  // Check to see if a hosted zone exist for the root domain and then continue.
  const hostedZone = await getHostedZoneForRootDomain(rootDomain)
  if (!hostedZone) {
    throw new Error(
      `You do not have a hosted zone for the rootDomain "${rootDomain}" make sure you own this domain or register for it via the aws console.`,
    )
  }

  // Lazily create and verify certificate
  const certificate = await lazyCreateCertificate({domain})
  if (!certificate) {
    throw new Error('Certificate could not be created')
  }
  if (!certificate.Status) {
    throw new Error('Certificate has no Status')
  }
  if (!certificate.CertificateArn) {
    throw new Error('Certificate has no CertificateArn')
  }
  if (
    ['SUCCESS', 'PENDING_VALIDATION', 'ISSUED'].includes(certificate.Status)
  ) {
    await requestAndVerifyCertificate({
      certificateArn: certificate.CertificateArn,
      hostedZoneId: hostedZone.Id,
    })
  }

  await lazyCreateSPABucket({fqdn})
  await uploadFiles({bucketName: fqdn, files})

  const distribution = await lazyCreateDistributionForFQDN({
    fqdn,
    aliases: [fqdn],
    arn: certificate.CertificateArn,
  })
  if (!distribution) {
    throw new Error('Cannot find distribution')
  }

  await upsertARecordToCloudFront({
    hostedZoneId: hostedZone.Id,
    cloudFrontDNSName: distribution.DomainName,
    fqdn,
  })
}
