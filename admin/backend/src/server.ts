import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/authRoutes';
import patientRoutes from './routes/patientRoutes';
import appointmentRoutes from './routes/appointments';
import consultationRoutes from './routes/consultationRoutes';
import chatRoutes from './routes/chatRoutes';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB Connection Error:', error));

// Test MongoDB Connection Route
app.get('/api/test-db', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const dbName = mongoose.connection.db?.databaseName || 'unknown';
      res.json({ 
        status: 'success',
        message: 'MongoDB is connected',
        database: dbName
      });
    } else {
      res.status(500).json({ 
        status: 'error',
        message: 'MongoDB is not connected',
        readyState: mongoose.connection.readyState
      });
    }
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/chat', chatRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Medical Practice Dashboard API is running');
});

// Error Handler
app.use(errorHandler);

// Create uploads directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 