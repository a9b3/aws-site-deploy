import * as AWS from 'aws-sdk'
import * as mime from 'mime-types'
import * as path from 'path'

import {uploadFiles} from './s3'
import {getAllPaths} from './utils'

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

  await uploadFiles({bucketName: fqdn, files})
}
