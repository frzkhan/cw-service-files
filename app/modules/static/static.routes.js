const { ctr } = require('@cowellness/cw-micro-service')()

module.exports = async function (fastify, opts, done) {
  fastify.get('/*', async function (request, reply) {
    const path = request.params['*']
    const file = await ctr.static.getFile(path)

    if (!file) {
      return reply.code(404).send('NOT_FOUND')
    }

    reply
      .type(file.mime)
      .send(file.buffer)
  })
}
