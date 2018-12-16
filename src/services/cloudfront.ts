import * as AWS from 'aws-sdk'
import {identity, memoizeWith} from 'ramda'

const getCloudFront = memoizeWith(identity, () => {
  return new AWS.CloudFront({})
})

/**
 * Page through all distributions
 */
export async function listDistributions(): Promise<
  AWS.CloudFront.DistributionSummaryList
> {
  const cloudFront = getCloudFront()
  let distributions: AWS.CloudFront.DistributionSummaryList = []

  let cursor = await cloudFront.listDistributions({}).promise()
  if (cursor.DistributionList && cursor.DistributionList.Items) {
    distributions = distributions.concat(cursor.DistributionList.Items)
  }

  while (cursor.DistributionList && cursor.DistributionList.IsTruncated) {
    cursor = await cloudFront.listDistributions({}).promise()
    if (cursor.DistributionList && cursor.DistributionList.Items) {
      distributions = distributions.concat(cursor.DistributionList.Items)
    }
  }

  return distributions
}

/**
 * Return distributions that have aliases matching given aliases
 */
export async function getDistributionMatchingAliases(aliases: string[]) {
  const distributions = await listDistributions()
  return distributions.filter(
    distribution =>
      distribution.Aliases &&
      distribution.Aliases.Items &&
      distribution.Aliases.Items.some(alias => aliases.includes(alias)),
  )
}

async function createDistribution({
  fqdn,
  aliases = [],
  arn,
}: {
  fqdn: string
  aliases: string[]
  arn: string
}) {
  const s3BucketOriginId = `S3-${fqdn}`
  const s3BucketDomainName = `${fqdn}.s3.amazonaws.com`
  const param = {
    DistributionConfig: {
      CallerReference: `${fqdn}:${aliases.join(',')}:${Date.now()}`,
      Aliases: {
        Quantity: aliases.length,
        Items: aliases,
      },
      DefaultRootObject: '/index.html',
      Origins: {
        Quantity: 1,
        Items: [
          {
            Id: s3BucketOriginId,
            DomainName: s3BucketDomainName,
            OriginPath: '',
            S3OriginConfig: {
              OriginAccessIdentity: '',
            },
          },
        ],
      },
      DefaultCacheBehavior: {
        TargetOriginId: s3BucketOriginId,
        ForwardedValues: {
          QueryString: true,
          Cookies: {
            Forward: 'none',
          },
          Headers: {
            Quantity: 0,
          },
        },
        TrustedSigners: {
          Enabled: false,
          Quantity: 0,
        },
        ViewerProtocolPolicy: 'redirect-to-https',
        MinTTL: 0,
        AllowedMethods: {
          Quantity: 2,
          Items: ['HEAD', 'GET'],
          CachedMethods: {
            Quantity: 2,
            Items: ['HEAD', 'GET'],
          },
        },
        SmoothStreaming: false,
        DefaultTTL: 86400,
        MaxTTL: 31536000,
        Compress: true,
      },
      CacheBehaviors: {
        Quantity: 0,
      },
      CustomErrorResponses: {
        Quantity: 1,
        Items: [
          {
            ErrorCode: 403,
            ResponsePagePath: '/index.html',
            ResponseCode: '200',
            ErrorCachingMinTTL: 300,
          },
        ],
      },
      Comment: '',
      PriceClass: 'PriceClass_All',
      Enabled: true,
      ViewerCertificate: {
        ACMCertificateArn: `${arn}`,
        SSLSupportMethod: 'sni-only',
        MinimumProtocolVersion: 'TLSv1',
        Certificate: `${arn}`,
        CertificateSource: 'acm',
      },
      Restrictions: {
        GeoRestriction: {
          RestrictionType: 'none',
          Quantity: 0,
        },
      },
      WebACLId: '',
    },
  }
  const {Distribution} = await getCloudFront()
    .createDistribution(param)
    .promise()

  if (!Distribution) {
    throw new Error('No Distribution created')
  }
  return Distribution
}

export async function lazyCreateDistributionForFQDN({
  fqdn,
  aliases,
  arn,
}: {
  fqdn: string
  aliases: string[]
  arn: string
}) {
  const cloudFront = getCloudFront()

  const distributions = await getDistributionMatchingAliases(aliases)
  const distribution =
    distributions.length > 0
      ? distributions[0]
      : await createDistribution({
        fqdn,
        aliases,
        arn,
      })

  const {Distribution} = await cloudFront
    .getDistribution({Id: distribution.Id})
    .promise()
  return Distribution
}
