const get = {
  required: ['_id'],
  properties: {
    _id: {
      type: 'string'
    },
    ex: {
      type: 'number'
    }
  }
}
const post = {
  required: ['filename', 'binData'],
  properties: {
    filename: {
      type: 'string'
    },
    isPublic: {
      type: 'boolean'
    },
    binData: {
      type: 'string'
    }
  }
}
const remove = {
  required: ['_id'],
  properties: {
    _id: {
      type: 'string'
    }
  }
}
const file = {
  schema: {
    tags: ['File'],
    summary: 'Get a file',
    params: {
      type: 'object',
      required: ['id', 'filename'],
      properties: {
        id: {
          type: 'string',
          description: 'File id'
        },
        filename: {
          type: 'string',
          description: 'File name'
        }
      }
    }
  }
}

module.exports = {
  get,
  post,
  remove,
  file
}
