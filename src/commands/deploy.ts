import {Command, flags} from '@oclif/command'
import cli from 'cli-ux'

import {invalidate} from '../services/cloudfront'
import deploy from '../services/deploy'

export default class Deploy extends Command {
  static description = 'deploy a static site to aws'

  static flags = {
    help: flags.help({char: 'h'}),
    source: flags.string({
      char: 's',
      description: 'source folder for static site',
      env: 'SOURCE',
      required: true,
    }),
    fqdn: flags.string({
      description: 'fqdn (fully qualified domain name) of the desire deploy',
      required: true,
    }),
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

  async run() {
    const {flags} = this.parse(Deploy)

    try {
      cli.action.start('uploading files to s3')
      await deploy(flags)
      cli.action.stop()

      cli.action.start('invalidating cloudfront')
      await invalidate({fqdn: flags.fqdn})
      cli.action.stop()
      this.log(`Visit your site at https://${flags.fqdn}`)
    } catch (err) {
      this.error(err.message)
      this.exit(1)
    }
  }
}
