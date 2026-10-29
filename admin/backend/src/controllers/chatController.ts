import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

interface AuthRequest extends Request {
  user: {
    _id: string;
    // ... other user properties
  };
}

export const createChat = async (req: AuthRequest, res: Response) => {
  try {
    const { consultationId, participants } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { data: chat, error } = await supabase
      .from('chats')
      .insert([{
        consultation_id: consultationId,
        participants: [...participants, req.user._id]
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(chat);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { chatId, content, messageType = 'text' } = req.body;
    
    // First verify chat exists and user is participant
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .contains('participants', [req.user._id])
      .single();

    if (chatError || !chat) {
      return res.status(404).json({ message: 'Chat not found or access denied' });
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert([{
        chat_id: chatId,
        sender_id: req.user._id,
        content,
        message_type: messageType,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getChatHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select(`
        *,
        messages:messages(
          *,
          sender:users(id, name)
        ),
        participants:users(id, name)
      `)
      .eq('id', req.params.chatId)
      .single();
      
    if (chatError || !chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 