import * as AWS from 'aws-sdk'
import * as fs from 'fs'
import {identity, memoizeWith} from 'ramda'

const getS3 = memoizeWith(
  identity,
  (): AWS.S3 => {
    return new AWS.S3({})
  },
)

function nextPagePromise(response: AWS.Response<D, E>): Promise<D> {
  return new Promise((resolve, reject) => {
    response.nextPage((e, d) => {
      return e ? reject(e) : resolve(d)
    })
  })
}

/**
 * Get all s3 buckets.
 */
async function listBuckets() {
  const s3 = getS3()

  let buckets = []
  let cursor = await s3.listBuckets().promise()
  if (cursor.Buckets) {
    buckets = buckets.concat(cursor.Buckets)
  }

  while (cursor.$response.hasNextPage()) {
    cursor = await nextPagePromise(cursor.$response)
    if (cursor.Buckets) {
      buckets = buckets.concat(cursor.Buckets)
    }
  }

  return buckets
}

async function createSPABucket({fqdn}: { fqdn: string }) {
  const s3 = getS3()
  await s3
    .createBucket({
      Bucket: fqdn,
    })
    .promise()
  await s3
    .putBucketPolicy({
      Bucket: fqdn,
      Policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${fqdn}/*`],
          },
        ],
      }),
    })
    .promise()
  await s3
    .putBucketWebsite({
      Bucket: fqdn,
      WebsiteConfiguration: {
        ErrorDocument: {
          Key: 'index.html',
        },
        IndexDocument: {
          Suffix: 'index.html',
        },
      },
    })
    .promise()
}

export async function lazyCreateSPABucket({fqdn}: { fqdn: string }) {
  const buckets = await listBuckets()
  if (!buckets.find(bucket => bucket.Name === fqdn)) {
    await createSPABucket({fqdn})
  }
}

/**
 * Upload a single file to the s3 bucket.
 */
async function uploadSingleFile({
  // key that will show up in s3
  key,
  // path to the file on local disk
  path,
  // mime-type of file
  type,
  bucketName,
}: {
  key: string
  path: string
  type: string
  bucketName: string
}) {
  const s3 = getS3()

  return s3
    .upload({
      Bucket: bucketName,
      Body: fs.createReadStream(path),
      Key: key,
      ContentType: type,
    })
    .promise()
}

/**
 * Upload an array of files
 */
export function uploadFiles({
  bucketName,
  files,
}: {
  bucketName: string
  files: { key: string; path: string; type: string }[]
}) {
  // TODO compensate failures for uploads to s3
  return Promise.all(
    files.map(({key, path, type}) =>
      uploadSingleFile({
        key,
        path,
        type,
        bucketName,
      }),
    ),
  )
}
