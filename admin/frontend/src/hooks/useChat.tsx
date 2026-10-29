import { useState, useCallback, useRef } from 'react';
import { Message, Attachment, MessageType } from '../types/index';
import { getChatCompletion } from '../lib/openai';

// Create a singleton instance to persist messages across navigation
let globalMessages: Message[] = [
  {
    id: '1',
    content: 'Hello Doctor, how can I assist you today?',
    role: 'assistant',
    timestamp: new Date(),
    type: 'text'
  },
];

export function useChat() {
  const [messages, setMessages] = useState<Message[]>(globalMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSending = useRef(false);

  const sendMessage = useCallback(async (content: string, files: File[]) => {
    if (isSending.current) return;
    isSending.current = true;

    try {
      // Set loading immediately
      setIsLoading(true);

      const userMessage: Message = {
        id: Date.now().toString(),
        content,
        role: 'user',
        timestamp: new Date(),
        attachments: [],
        type: 'text'
      };

      // Update messages state immediately with user message
      setMessages(prev => [...prev, userMessage]);

      // Get chat history
      const chatHistory = [...messages, userMessage]
        .slice(-5)
        .map(({ role, content }) => ({ role, content }));

      // Get AI response
      const aiResponse = await getChatCompletion(chatHistory);

      if (!aiResponse || !aiResponse.content) {
        throw new Error('No response received from AI');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse.content,
        role: 'assistant',
        timestamp: new Date(),
        type: 'text',
        metadata: undefined
      };

      // Update messages with AI response
      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      console.error('Error in sendMessage:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, there was an error processing your request. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
        type: 'text',
        metadata: undefined
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      // Clear loading state
      setIsLoading(false);
      isSending.current = false;
    }
  }, [messages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
  };
}