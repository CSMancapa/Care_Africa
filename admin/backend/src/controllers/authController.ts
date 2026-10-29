import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { Document } from 'mongoose';

interface AuthRequest extends Request {
  user: {
    _id: string;
    name: string;
    email: string;
    role: "doctor" | "admin" | "staff";
    specialization?: string;
  };
}

interface UserDocument extends Document {
  name: string;
  email: string;
  password: string;
  role: "doctor" | "admin" | "staff";
  specialization?: string;
  matchPassword(password: string): Promise<boolean>;
}

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: '30d',
  });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, specialization } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      specialization
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id as unknown as string)
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ message: errorMessage });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password') as UserDocument;

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (isMatch) {
      return res.json({
        _id: user._id,
        email: user.email,
        token: generateToken(user._id as string)
      });
    }

    return res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ message: errorMessage });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ message: errorMessage });
  }
};
