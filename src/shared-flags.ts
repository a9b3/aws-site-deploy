import {flags} from '@oclif/command'

export default {
  awsSecretAccessKey: flags.string({
    description: 'aws secret access key',
    env: 'AWS_SECRET_ACCESS_KEY',
  }),
  awsAccessKeyId: flags.string({
    description: 'aws access key id',
    env: 'AWS_ACCESS_KEY_ID',
  }),
  awsRegion: flags.string({description: 'aws region', env: 'AWS_REGION'}),
  awsEndpoint: flags.string({
    description: 'aws endpoint',
    env: 'AWS_ENDPOINT',
  }),
}
