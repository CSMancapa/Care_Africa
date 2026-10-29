const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  doctorId: {
    type: String,
    required: true
  },
  templateName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed'],
    default: 'active'
  }
});

module.exports = mongoose.model('Campaign', campaignSchema); 