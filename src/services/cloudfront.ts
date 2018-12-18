import * as AWS from 'aws-sdk'
import {identity, memoizeWith} from 'ramda'

const getCloudFront = memoizeWith(
  identity,
  (): AWS.CloudFront => {
    return new AWS.CloudFront({})
  },
)

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

export async function invalidate({fqdn}: { fqdn: string }) {
  const cloudfront = getCloudFront()

  const distribution = await getDistributionMatchingAliases([fqdn])
  if (distribution.length === 0) {
    throw new Error(`No distribution found for ${fqdn}`)
  }

  await cloudfront
    .createInvalidation({
      DistributionId: distribution[0].Id,
      InvalidationBatch: {
        CallerReference: `${fqdn}-${Date.now()}`,
        Paths: {
          Quantity: 1,
          Items: ['/*'],
        },
      },
    })
    .promise()
}
