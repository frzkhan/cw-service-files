const { db, redis, _, log } = require('@cowellness/cw-micro-service')()

const FileType = require('file-type')
const fs = require('fs').promises
const axios = require('axios')
const { nanoid } = require('nanoid')
const sharp = require('sharp')

const constants = require('./file.constants')
const ImageOptimizer = require('../../lib/imageOptimizer')
/**
 * @class FilesController
 * @classdesc Controller Files
 */
class FilesController {
  constructor () {
    this.Files = db.files.model('Files')
  }
  /**
   * Fetch one doc by filter
   * @param {Object} filter
   * @returns {Object} file model data
   */

  async findOne ({ id, filename }) {
    const isAlias = id.length === 30
    const isDbId = id.length === 24
    let dbId = null

    if (isAlias) {
      dbId = await this.cache(id)
    }
    if (isDbId) {
      dbId = id
    }
    return this.Files.findOne({
      _id: dbId,
      filename
    })
  }
  /**
   * Delete one doc by filter
   * @param {Object} filter
   * @returns {Object} delete model data
   */

  deleteOne (filter) {
    return this.Files.deleteOne(filter)
  }

  /**
   * Generate a public url
   * @param {String} id
   * @param {String} filename
   * @returns {String} file path
   */
  generatePublicUrl (id, filename) {
    return `/file/${id}/${filename}`
  }

  /**
   * Set/Get data from redis
   * @param {String} aliasId generated alias name
   * @param {String} value Optional: mongodb _id to set in redis
   * @param {Number} ex Optional: expiry in seconds
   * @returns {String} the value from redis
   */
  async cache (aliasId, value, ex) {
    const key = `file:${aliasId}`

    if (value) {
      await redis.set(key, value, 'EX', ex)
    }
    return redis.get(key)
  }

  /**
   * Set/Get thumbail from redis
   * @param {String} size xs,sm,md,lg
   * @param {String} id id
   * @param {String} value Optional: Buffer data of thumbnail
   * @param {Number} ex Optional: expiry in seconds
   * @returns {String} the value from redis
   */
  async cacheThumbnail (size, id, value, ex) {
    const key = `thumbnail:${size}:${id}`
    const expiry = ex || constants.THUMBNAIL_DEFAULT_EXPIRY

    if (value) {
      await redis.set(key, value, 'EX', expiry)
    }
    const redisValue = await redis.get(key)

    if (redisValue) {
      await redis.expire(key, expiry)
    }
    return redisValue
  }

  /**
   * Generate a thumbnail and returns buffer
   *
   * @param {Object} file file object
   * @param {Number} size xs, ms, md, lg
   * @returns {Buffer} the thumbnails buffer data
   */
  async getThumbnail (file, size) {
    const dimension = constants.THUMBNAIL_SIZE[size]
    if (!dimension) {
      return null
    }
    if (!file.mimeType.startsWith('image')) {
      return null
    }
    const thumbnail = await this.cacheThumbnail(size, file._id)

    if (thumbnail) {
      return Buffer.from(thumbnail, 'base64')
    }
    const bufferData = await sharp(file.binData)
      .resize(dimension)
      .jpeg({ quality: constants.THUMBNAIL_QUALITY })
      .toBuffer()
    const base64 = Buffer.from(bufferData).toString('base64')
    await this.cacheThumbnail(size, file._id, base64)
    return bufferData
  }

  /**
   * Fetch a file info based on id
   * @param {{_id: string, ex?: number}} data
   * @returns {Object} file information
   */
  async getFileInfo ({ _id, ex }) {
    const fileData = await this.Files.findOne({ _id })

    if (!fileData) {
      return null
    }
    const result = {
      _id,
      filename: fileData.filename,
      extension: fileData.extension,
      mimeType: fileData.mimeType,
      size: fileData.size,
      url: this.generatePublicUrl(_id, fileData.filename)
    }

    if (!fileData.isPublic || ex) {
      const aliasId = nanoid(constants.NANOID_LENGTH)
      const expiry = ex || constants.REDIS_ALIAS_EXPIRE

      await this.cache(aliasId, _id, expiry)
      result.url = this.generatePublicUrl(aliasId, fileData.filename)
    }

    return result
  }

  /**
   * Creates a file doc in database
   * @param {Object} data file data model object
   * @returns {Object} file information
   */
  async create (data) {
    const binData = Buffer.from(data.binData, 'base64')
    const fileType = await FileType.fromBuffer(binData)
    const extension = _.get(fileType, 'ext', null)
    const mimeType = _.get(fileType, 'mime', null)
    const size = Buffer.byteLength(binData)
    const filenameExt = _.get(data, 'filename', 'gen_' + Date.now()).split('.')
    filenameExt.pop()
    const filename = filenameExt.join()
    const fileData = await this.Files.create({
      filename: _.kebabCase(filename) + '.' + extension,
      extension,
      mimeType,
      size,
      binData,
      isPublic: data.isPublic
    })
    return this.getFileInfo({
      _id: fileData._id
    })
  }

  /**
   * Finds a file with filter and updates with data
   * @param {Object} filter
   * @param {Object} data
   * @returns file model data
   */
  async findOneAndUpdate (filter, data) {
    const file = await this.Files.findOne(filter)

    if (!file) {
      return null
    }
    file.set(data)
    return file.save()
  }

  /**
   * Optimize and update image file
   * @param {String} options {_id, options}
   * @returns updated file
   */
  async optimize ({ _id, options }) {
    const file = await this.Files.findOne({ _id })
    if (!file) {
      return null
    }
    const fileLocation = `./tmp/${file._id}-${file.filename}`

    await fs.writeFile(fileLocation, file.binData)
    const imageOptimizer = new ImageOptimizer(options)
    const optimizedData = await imageOptimizer.optimize(fileLocation)

    if (optimizedData && optimizedData.success) {
      const binData = await this.urlToBuffer(optimizedData.url)
      await fs.unlink(fileLocation)

      log.info(`Optimized file ${file.filename} - saved space ${optimizedData.saved_percent}%`)

      return this.findOneAndUpdate({ _id }, {
        binData,
        size: optimizedData.optimized_size
      })
    }
    return null
  }

  /**
   * Converts an external url to Buffer
   * @param {String} url external url
   * @returns {Buffer} data
   */
  async urlToBuffer (url) {
    const response = await axios.get(url, {
      responseType: 'arraybuffer'
    })

    return Buffer.from(response.data, 'binary')
  }
}

module.exports = FilesController
