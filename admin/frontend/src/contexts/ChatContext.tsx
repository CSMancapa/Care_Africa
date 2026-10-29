import React, { createContext, useContext, ReactNode } from 'react';

interface Message {
  role: string;
  content: string;
}

interface ChatContextType {
  sendMessage: (message: Message) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const sendMessage = (message: Message) => {
    // Implement your message sending logic here
    console.log('Message sent:', message);
  };

  return (
    <ChatContext.Provider value={{ sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}; 