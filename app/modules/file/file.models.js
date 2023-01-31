const { db } = require('@cowellness/cw-micro-service')()

const Schema = db.files.Schema

const newSchema = new Schema(
  {
    filename: {
      type: String,
      index: true
    },
    extension: {
      type: String
    },
    mimeType: {
      type: String
    },
    size: {
      type: Number
    },
    binData: {
      type: Buffer
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
)

module.exports = db.files.model('Files', newSchema)
