import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['doctor', 'admin', 'staff'],
    default: 'staff'
  },
  specialization: {
    type: String,
    required: function(this: { role: string }) { 
      return this.role === 'doctor'; 
    }
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function(enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'doctor' | 'admin' | 'staff';
  specialization?: string;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

export default mongoose.model('User', userSchema); 