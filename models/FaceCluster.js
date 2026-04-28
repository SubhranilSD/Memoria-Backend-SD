const mongoose = require('mongoose');

const faceClusterSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  clusters: [
    {
      id: String,
      name: { type: String, default: 'Unknown Person' },
      faceUrl: String,
      avgDescriptor: [Number],
      eventIds: [String],
      mediaUrls: [String],
      photoCount: Number
    }
  ],
  groups: [
    {
      id: String,
      name: String,
      peopleIds: [String]
    }
  ],
  birthdays: {
    type: Map,
    of: String
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FaceCluster', faceClusterSchema);
