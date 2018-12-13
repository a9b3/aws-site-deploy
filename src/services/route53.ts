import * as AWS from 'aws-sdk'
import {identity, memoizeWith} from 'ramda'

const getRoute53 = memoizeWith(
  identity,
  (): AWS.Route53 => {
    return new AWS.Route53({})
  },
)

export async function listHostedZones() {
  const route53 = getRoute53()

  let zones: AWS.Route53.HostedZones = []
  let cursor = await route53.listHostedZones().promise()
  if (cursor.HostedZones) {
    zones = zones.concat(cursor.HostedZones)
  }

  while (cursor.IsTruncated) {
    cursor = await route53
      .listHostedZones({Marker: cursor.NextMarker})
      .promise()
    if (cursor.HostedZones) {
      zones = zones.concat(cursor.HostedZones)
    }
  }

  return zones
}

/**
 * Get hosted zone for the given root domain.
 */
export async function getHostedZoneForRootDomain(
  rootDomain: string,
): Promise<AWS.Route53.HostedZone | undefined> {
  // Add trailing dot if it doesn't exist because AWS adds trailing dot to root
  // domain name.
  rootDomain = /.*\.$/.test(rootDomain) ? rootDomain : rootDomain + '.'

  const zones = await listHostedZones()
  return zones.find(zone => zone.Name === rootDomain)
}

export async function upsertARecordToCloudFront({
  hostedZoneId,
  fqdn,
  cloudFrontDNSName,
}: {
  hostedZoneId: string
  fqdn: string
  cloudFrontDNSName: string
}) {
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-route53-aliastarget.html
  const CLOUD_FRONT_HOSTED_ZONE_ID = 'Z2FDTNDATAQYW2'

  const route53 = getRoute53()

  return route53
    .changeResourceRecordSets({
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              AliasTarget: {
                HostedZoneId: CLOUD_FRONT_HOSTED_ZONE_ID,
                DNSName: cloudFrontDNSName,
                EvaluateTargetHealth: false,
              },
              Name: fqdn,
              Type: 'A',
            },
          },
        ],
      },
      HostedZoneId: hostedZoneId,
    })
    .promise()
}
