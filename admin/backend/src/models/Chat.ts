import mongoose, { Schema, Document } from 'mongoose';

interface IMessage {
  sender: mongoose.Types.ObjectId;
  content: string;
  messageType: string;
  timestamp: Date;
}

interface IChat extends Document {
  consultation: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  messages: IMessage[];
}

const ChatSchema = new Schema({
  consultation: { type: Schema.Types.ObjectId, ref: 'Consultation', required: true },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  messages: [{
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    content: String,
    messageType: { type: String, default: 'text' },
    timestamp: { type: Date, default: Date.now }
  }]
});

export default mongoose.model<IChat>('Chat', ChatSchema); 