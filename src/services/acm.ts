import * as AWS from 'aws-sdk'
import {identity, memoizeWith, pathOr} from 'ramda'

const getACM = memoizeWith(
  identity,
  (): AWS.ACM => {
    return new AWS.ACM({})
  },
)

/**
 * Get all certs.
 */
async function listCertificates() {
  const acm = getACM()

  let certs: AWS.ACM.CertificateSummaryList = []
  let cursor = await acm.listCertificates().promise()
  if (cursor.CertificateSummaryList) {
    certs = certs.concat(cursor.CertificateSummaryList)
  }

  while (cursor.NextToken) {
    let cursor = await acm.listCertificates().promise()
    if (cursor.CertificateSummaryList) {
      certs = certs.concat(cursor.CertificateSummaryList)
    }
  }

  return certs
}

/**
 * Finds certificate that is usable for the given fqdn.
 * ex.
 * A certificate signed for *.bar.example.com can be used for foo.bar.example.com
 * *.example.com cannot be used for foo.bar.example.com
 */
function getUsableCertificate({
  domain,
  certificates,
}: {
  domain: string
  certificates: AWS.ACM.CertificateSummaryList
}): AWS.ACM.CertificateSummary | undefined {
  return certificates.find(cert => {
    // Replicate matching logic of a wildcard certificate
    // https://en.wikipedia.org/wiki/Wildcard_certificate
    // Only one level of subdomains (eg. foo.bar.example.com is not valid)
    // Naked URL is also valid (eg. example.com)
    return new RegExp(
      pathOr('', ['DomainName'])(cert)
        .replace('*.', '^([a-zA-Z0-9-_]+.)?')
        .replace('.', '\\.'),
    ).test(domain)
  })
}

export async function lazyCreateCertificate({domain}: { domain: string }) {
  const acm = getACM()

  const certificates = await listCertificates()
  const certificate =
    getUsableCertificate({domain, certificates}) ||
    (await acm
      .requestCertificate({
        DomainName: `*.${domain}`,
        ValidationMethod: 'DNS',
      })
      .promise())

  if (!certificate.CertificateArn) {
    throw new Error('Unable to get certificate')
  }

  const {Certificate} = await acm
    .describeCertificate({CertificateArn: certificate.CertificateArn})
    .promise()
  return Certificate
}
