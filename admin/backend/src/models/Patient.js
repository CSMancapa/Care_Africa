const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  bloodType: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  allergies: [String],
  idNumber: { type: String, required: true },
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date,
    prescribedBy: String,
    notes: String,
    chronicCondition: String
  }],
  conditions: [{
    name: String,
    diagnosedDate: Date,
    status: {
      type: String,
      enum: ['active', 'resolved', 'managed']
    },
    notes: String
  }],
  visits: [{
    date: Date,
    type: {
      type: String,
      enum: ['check-up', 'follow-up', 'emergency', 'consultation']
    },
    chiefComplaint: String,
    diagnosis: String,
    treatment: String,
    notes: String,
    vitals: {
      bloodPressure: String,
      heartRate: Number,
      temperature: Number,
      respiratoryRate: Number,
      weight: Number,
      height: Number,
      bmi: Number
    },
    documents: [{
      type: {
        type: String,
        enum: ['lab_result', 'prescription', 'imaging', 'report']
      },
      title: String,
      date: Date,
      url: String
    }]
  }],
  practitionerId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Remove the practiceId index since we're not using it anymore
patientSchema.index({ practitionerId: 1 });

module.exports = mongoose.model('Patient', patientSchema); 