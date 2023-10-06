const getAuth = require('npm-registry-fetch/lib/auth.js')
const npmFetch = require('npm-registry-fetch')
const log = require('../utils/log-shim')
const BaseCommand = require('../base-command.js')

class Logout extends BaseCommand {
  static description = 'Log out of the registry'
  static name = 'logout'
  static params = [
    'registry',
    'scope',
  ]

  async exec (args) {
    const registry = this.npm.config.get('registry')
    const scope = this.npm.config.get('scope')
    const regRef = scope ? `${scope}:registry` : 'registry'
    const reg = this.npm.config.get(regRef) || registry

    const auth = getAuth(reg, this.npm.flatOptions)

    const regKey = auth.regKey
    let level = 'user'
    const authConfigs = ['_authToken', '_auth', 'username', 'certfile']
    for (const c of authConfigs) {
      if (this.npm.config.find(`${regKey}:${c}`) === 'project') {
        level = 'project'
        break
      }
    }

    // find the config level and only delete from there
    if (auth.token) {
      log.verbose('logout', `clearing token for ${reg}`)
      await npmFetch(`/-/user/token/${encodeURIComponent(auth.token)}`, {
        ...this.npm.flatOptions,
        method: 'DELETE',
        ignoreBody: true,
      })
    } else if (auth.isBasicAuth) {
      log.verbose('logout', `clearing user credentials for ${reg}`)
    } else {
      const msg = `not logged in to ${reg}, so can't log out!`
      throw Object.assign(new Error(msg), { code: 'ENEEDAUTH' })
    }

    if (scope) {
      this.npm.config.delete(regRef, level)
    }

    this.npm.config.clearCredentialsByURI(reg, level)

    await this.npm.config.save('user')
  }
}
module.exports = Logout
