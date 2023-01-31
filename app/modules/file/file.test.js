const config = require('config')
const cw = require('@cowellness/cw-micro-service')(config)
const imgGen = require('js-image-generator')

const PREFIX_URL = '/api/files'

function createImage () {
  return new Promise((resolve, reject) => {
    imgGen.generateImage(10, 10, 0, function (error, image) {
      if (error) {
        return reject(error)
      }
      resolve(image)
    })
  })
}
function delay (ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}
beforeAll(async () => {
  await cw.autoStart()
  await cw.redis.flushdb()
  await cw.mongodb.files.model('Files').deleteMany()
})
afterAll(async () => {
  await cw.stopAll()
})

describe('Test File service', () => {
  it('should save a file', async () => {
    const image = await createImage()
    const buffer = image.data
    const msg = await cw.rabbitmq.sendAndRead('/files/post', {
      filename: 'test.png',
      isPublic: true,
      binData: buffer.toString('base64')
    })
    const data = msg.data

    expect(data.extension).toEqual('jpg')
  })
  it('should error if filename missing', async () => {
    const msg = await cw.rabbitmq.sendAndRead('/files/post', {
      isPublic: true
    })
    const data = msg.data

    expect(data.errors).not.toBe(undefined)
    expect(data.errors.filename.length).toBeGreaterThan(0)
  })
  it('should get info on a file', async () => {
    const image = await createImage()
    const buffer = image.data
    const msg = await cw.rabbitmq.sendAndRead('/files/post', {
      filename: 'test.png',
      isPublic: true,
      binData: buffer.toString('base64')
    })
    const info = await cw.rabbitmq.sendAndRead('/files/get', {
      _id: msg.data._id
    })
    expect(info.data._id).toBe(msg.data._id)
    expect(info.data.filename).toBe(msg.data.filename)
    expect(info.data.extension).toBe(msg.data.extension)
  })
  it('should get info on a file and expire', async () => {
    const EXPIRY_SECONDS = 2
    const image = await createImage()
    const buffer = image.data
    const msg = await cw.rabbitmq.sendAndRead('/files/post', {
      filename: 'test.png',
      isPublic: true,
      binData: buffer.toString('base64')
    })
    const info = await cw.rabbitmq.sendAndRead('/files/get', {
      _id: msg.data._id,
      ex: EXPIRY_SECONDS
    })
    const beforeDelay = await cw.fastify.inject({ method: 'GET', url: PREFIX_URL + info.data.url })

    await delay(2000)

    const afterDelay = await cw.fastify.inject({ method: 'GET', url: PREFIX_URL + info.data.url })

    expect(beforeDelay.statusCode).toBe(200)
    expect(afterDelay.statusCode).toBe(404)
    expect(info.data._id).toBe(msg.data._id)
    expect(info.data.filename).toBe(msg.data.filename)
    expect(info.data.extension).toBe(msg.data.extension)
  })
  it('should error get if id not provided', async () => {
    const msg = await cw.rabbitmq.sendAndRead('/files/get', {})

    expect(msg.data.errors._id.length).toBeGreaterThan(0)
  })
  it('should delete a file', async () => {
    const image = await createImage()
    const buffer = image.data
    const msg = await cw.rabbitmq.sendAndRead('/files/post', {
      filename: 'test.png',
      isPublic: true,
      binData: buffer.toString('base64')
    })
    const info = await cw.rabbitmq.sendAndRead('/files/delete', {
      _id: msg.data._id
    })

    expect(info.data.deletedCount).toEqual(1)
  })
  it('should error delete if id not provided', async () => {
    const msg = await cw.rabbitmq.sendAndRead('/files/delete', {})

    expect(msg.data.errors._id.length).toBeGreaterThan(0)
  })
  it('should check header content-type', async () => {
    const image = await createImage()
    const buffer = image.data
    const msg = await cw.rabbitmq.sendAndRead('/files/post', {
      filename: 'mimetype.jpg',
      isPublic: true,
      binData: buffer.toString('base64')
    })
    const file = await cw.mongodb.files.model('Files').findOne({ _id: msg.data._id })
    const res = await cw.fastify.inject({ method: 'GET', url: PREFIX_URL + msg.data.url })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe(file.mimeType)
  })
})
