import mongoose from 'mongoose';

const consultationSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  symptoms: [String],
  diagnosis: String,
  prescription: [{
    medication: String,
    dosage: String,
    frequency: String,
    duration: String
  }],
  notes: String,
  followUp: {
    recommended: Boolean,
    date: Date
  }
}, {
  timestamps: true
});

export default mongoose.model('Consultation', consultationSchema); 