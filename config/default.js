const path = require('path')
const basepath = path.join(__dirname, '..', 'app')

module.exports = {
  service: 'files',
  fastify: { active: true, port: 3010, prefix: '/api/files' },
  rabbitmq: { active: true, server: 'localhost:15672', user: 'dev', password: 'dev123' },
  redis: { active: true, server: 'localhost', port: 16379 },
  swagger: { active: true, exposeRoute: true },
  logger: { level: 'debug' },
  basepath,
  options: {
    optimizerKey: ''
  },
  mongodb: {
    active: true,
    server: 'localhost',
    port: '37017',
    user: '',
    password: '',
    debug: true,
    databases: [
      {
        name: 'files',
        db: 'files',
        options: {}
      }
    ]
  }
}
