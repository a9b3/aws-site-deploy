import {expect} from 'chai'

import {matchDomain, parseFqdn} from '../../src/services/deploy'

describe('matchDomain', () => {
  const testCases: { input: [string, string]; output: boolean }[] = [
    {
      input: ['*.example.com', 'example.com'],
      output: true,
    },
    {
      input: ['*.example.com', 'www.example.com'],
      output: true,
    },
    {
      input: ['*.example.com', 'not a url'],
      output: false,
    },
    // multiple subdomain
    {
      input: ['*.example.com', 'foo.bar.example.com'],
      output: false,
    },
    // non alphanumeric
    {
      input: ['*.example.com', 'asd#*bar.example.com'],
      output: false,
    },
  ]
  testCases.map(({input, output}) => {
    it(`expect "${input[0]}" to ${output ? 'match' : 'not match'} "${
      input[1]
    }"`, () => {
      expect(matchDomain(...input)).equals(output)
    })
  })
})

describe('parseFqdn', () => {
  const testCases: {
    input: [string]
    output: ReturnType<typeof parseFqdn>
  }[] = [
    {
      input: ['www.example.com'],
      output: {
        hostname: 'www',
        domain: 'example.com',
        rootDomain: 'example.com',
      },
    },
    {
      input: ['example.com'],
      output: {
        hostname: undefined,
        domain: 'example.com',
        rootDomain: 'example.com',
      },
    },
    {
      input: ['foo.bar.example.com'],
      output: {
        hostname: 'foo',
        domain: 'bar.example.com',
        rootDomain: 'example.com',
      },
    },
    {
      input: ['zed.foo.bar.example.com'],
      output: {
        hostname: 'zed',
        domain: 'foo.bar.example.com',
        rootDomain: 'example.com',
      },
    },
  ]

  testCases.map(({input, output}) => {
    it(`expect "${input[0]}" to output ${JSON.stringify(output)}`, () => {
      expect(parseFqdn(...input)).deep.equals(output)
    })
  })
})
