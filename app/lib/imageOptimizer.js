const { log, factoryConfig, _ } = require('@cowellness/cw-micro-service')()
const config = factoryConfig
const fs = require('fs')
const axios = require('axios')
const FormData = require('form-data')

class ImageOptimizer {
  constructor (options) {
    this.options = options || {}
    this.key = config.options.optimizerKey
    if (!this.key) {
      log.error('ImageOptimizer:Key not found at config.options.optimizerKey')
    }
    this.optimizeUrl = 'https://api.megaoptim.com/v1/optimize'
  }

  async optimize (filepath) {
    const response = await this.requestOptimizer(filepath)
    const status = response.status

    if (status === 'ok') {
      log.info(`ImageOptimizer:Ok: ${filepath} ${response.result}`)
      return _.get(response, 'result[0]')
    } else
    if (status === 'processing') {
      const processId = response.process_id
      const optimizedResponse = await this.requestResult(processId)

      log.info(`ImageOptimizer:Processing: ${filepath} ${optimizedResponse.result}`)
      return _.get(optimizedResponse, 'result[0]')
    } else
    if (status === 'error') {
      log.error(`ImageOptimizer:Error: ${filepath} ${response.errors}`)
      return null
    }
    log.error('ImageOptimizer:UnExpectedApiError')
    return null
  }

  async requestOptimizer (filepath) {
    const form = new FormData()

    Object.keys(this.options).forEach(key => {
      form.append(key, this.options[key])
    })
    form.append('type', 'file')
    form.append('file', fs.createReadStream(filepath))
    const response = await axios({
      method: 'post',
      url: this.optimizeUrl,
      data: form,
      headers: {
        'X-API-KEY': this.key,
        ...form.getHeaders()
      }
    })

    return response.data
  }

  async requestResult (processId) {
    const response = await axios({
      method: 'post',
      url: `${this.optimizeUrl}/${processId}/result?timeout=300`,
      headers: {
        'X-API-KEY': this.key
      }
    })

    return response.data
  }
}

module.exports = ImageOptimizer
