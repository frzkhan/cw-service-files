const { ctr } = require('@cowellness/cw-micro-service')()
const routeSchema = require('./file.schema')

module.exports = async function (fastify, opts, done) {
  fastify.get('/:id/:filename', routeSchema.file, async function (request, reply) {
    const id = request.params.id
    const filename = request.params.filename
    const size = request.query.size
    const file = await ctr.file.findOne({
      id,
      filename
    })
    if (!file) {
      return reply.code(404).send('NOT_FOUND')
    }
    if (size) {
      const thumbnail = await ctr.file.getThumbnail(file, size)
      if (thumbnail) {
        return reply.type('image/jpeg').send(thumbnail)
      }
    }

    reply
      .type(file.mimeType)
      .send(file.binData)
  })
  done()
}
