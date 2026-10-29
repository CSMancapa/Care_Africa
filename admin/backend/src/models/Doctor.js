const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  practiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Practice',
    required: true
  }
  // Add other doctor fields as needed
});

module.exports = mongoose.model('Doctor', doctorSchema); 