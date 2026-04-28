const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  date: { type: Date, required: true },
  location: { type: String, default: '' },
  mood: {
    type: String,
    default: 'joyful'
  },
  media: [{
    url: { type: String },
    publicId: { type: String },
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    focalPoint: {
      x: { type: Number, default: 50 },
      y: { type: Number, default: 50 },
      scale: { type: Number, default: 1 },
      aspectRatio: { type: String, default: 'original' },
      customAspect: { type: Number, default: 1 }
    }
  }],
  tags: [{ type: String }],
  people: [{ type: String }],
  audioUrl: { type: String },
  unlockDate: { type: Date },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  color: { type: String, default: '#6366f1' },
  sortIndex: { type: Number, default: 0 },
  nodePosition: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  isPrivate: { type: Boolean, default: false },
  type: { type: String, enum: ['event', 'dream'], default: 'event' },
  biometrics: {
    heartRate: { type: Number },
    stressLevel: { type: Number }
  },
  collaborators: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

eventSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

eventSchema.index({ user: 1, date: -1 });
eventSchema.index({ user: 1, sortIndex: 1 });

module.exports = mongoose.model('Event', eventSchema);
