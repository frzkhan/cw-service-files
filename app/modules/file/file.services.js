const { ctr, rabbitmq, log } = require('@cowellness/cw-micro-service')()
const validationSchema = require('./file.schema')

rabbitmq.consume('/files/get', (msg) => {
  const data = msg.data
  const hasErrors = rabbitmq.validate(validationSchema.get, data)

  if (hasErrors) {
    return {
      errors: hasErrors
    }
  }

  return ctr.file.getFileInfo(data)
})

rabbitmq.consume('/files/post', (msg) => {
  try {
    const data = msg.data
    const hasErrors = rabbitmq.validate(validationSchema.post, data)

    if (hasErrors) {
      return {
        errors: hasErrors
      }
    }
    return ctr.file.create(data)
  } catch (error) {
    log.error(`Files:post:queue:error: ${error}`)
    return error
  }
})

rabbitmq.consume('/files/delete', (msg) => {
  const data = msg.data
  const hasErrors = rabbitmq.validate(validationSchema.remove, data)

  if (hasErrors) {
    return {
      errors: hasErrors
    }
  }

  return ctr.file.deleteOne({ _id: data._id })
})

rabbitmq.consume('/files/optimize', (msg) => {
  const data = msg.data

  return ctr.file.optimize({ _id: data._id, options: data.options })
})
