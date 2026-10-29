const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },
  uid: { type: String, required: true },
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  type: { type: String, required: true },
  date: { type: Date, required: true },
  duration: { type: Number, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true },
  notes: { type: String, default: '' },
  assignedDoctor: { type: String, required: true },
  status: { type: String, required: true, enum: ['scheduled', 'completed', 'cancelled', 'walk-in'] },
  source: { type: String, required: true, enum: ['internal', 'external'] }
}, {
  timestamps: true
});

appointmentSchema.pre('save', function(next) {
  if (this.isNew) {
    delete this._id;
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema); 