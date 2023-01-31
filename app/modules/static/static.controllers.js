const { log } = require('@cowellness/cw-micro-service')()
const fs = require('fs')
const FileType = require('file-type')

/**
 * @class StaticController
 * @classdesc Controller Static
 */
class StaticController {
  async getFile (path) {
    const filePath = `./static/${path}`
    try {
      const buffer = fs.readFileSync(filePath)
      const { mime } = await FileType.fromBuffer(buffer)

      return {
        mime,
        buffer
      }
    } catch (error) {
      log.error('Static files: getFile, path: %s, %j', filePath, error)
      return null
    }
  }
}

module.exports = StaticController
