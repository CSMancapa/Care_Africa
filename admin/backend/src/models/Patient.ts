import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  medicalHistory: [{
    condition: String,
    diagnosisDate: Date,
    notes: String
  }],
  consultations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultation'
  }]
}, {
  timestamps: true
});

export default mongoose.model('Patient', patientSchema); 