import type { Options } from '@wdio/types'

export const config: Options.Testrunner = {
  runner: "browser",
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 600 * 10000
  },
  capabilities: [{
    browserName: 'chrome'
  }],
  specs: [
    [`./test/**/*spec.ts`]
  ],
  logLevel: 'warn',
}