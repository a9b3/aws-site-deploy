import * as AWS from 'aws-sdk'
import * as fs from 'fs'
import {identity, memoizeWith} from 'ramda'

const getS3 = memoizeWith(
  identity,
  (): AWS.S3 => {
    return new AWS.S3({})
  },
)

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
