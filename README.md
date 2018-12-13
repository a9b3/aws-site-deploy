aws-site-deploy
===============

Deploy static site to AWS

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/aws-site-deploy.svg)](https://npmjs.org/package/aws-site-deploy)
[![CircleCI](https://circleci.com/gh/esayemm/aws-site-deploy/tree/master.svg?style=shield)](https://circleci.com/gh/esayemm/aws-site-deploy/tree/master)
[![Downloads/week](https://img.shields.io/npm/dw/aws-site-deploy.svg)](https://npmjs.org/package/aws-site-deploy)
[![License](https://img.shields.io/npm/l/aws-site-deploy.svg)](https://github.com/esayemm/aws-site-deploy/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g aws-site-deploy
$ aws-site-deploy COMMAND
running command...
$ aws-site-deploy (-v|--version|version)
aws-site-deploy/0.0.0 darwin-x64 node-v10.10.0
$ aws-site-deploy --help [COMMAND]
USAGE
  $ aws-site-deploy COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`aws-site-deploy deploy [FILE]`](#aws-site-deploy-deploy-file)
* [`aws-site-deploy goodbye [FILE]`](#aws-site-deploy-goodbye-file)
* [`aws-site-deploy hello [FILE]`](#aws-site-deploy-hello-file)
* [`aws-site-deploy help [COMMAND]`](#aws-site-deploy-help-command)

## `aws-site-deploy deploy [FILE]`

describe the command here

```
USAGE
  $ aws-site-deploy deploy [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print
```

_See code: [src/commands/deploy.ts](https://github.com/esayemm/aws-site-deploy/blob/v0.0.0/src/commands/deploy.ts)_

## `aws-site-deploy goodbye [FILE]`

describe the command here

```
USAGE
  $ aws-site-deploy goodbye [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print
```

_See code: [src/commands/goodbye.ts](https://github.com/esayemm/aws-site-deploy/blob/v0.0.0/src/commands/goodbye.ts)_

## `aws-site-deploy hello [FILE]`

describe the command here

```
USAGE
  $ aws-site-deploy hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ aws-site-deploy hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/esayemm/aws-site-deploy/blob/v0.0.0/src/commands/hello.ts)_

## `aws-site-deploy help [COMMAND]`

display help for aws-site-deploy

```
USAGE
  $ aws-site-deploy help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.1.4/src/commands/help.ts)_
<!-- commandsstop -->
