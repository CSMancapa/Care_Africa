import React from 'react';
import { useLocation } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useTheme } from '../contexts/ThemeContext';
import { MessageContent } from '../components/chatbot/messageContent';

export default function Chatbot() {
  const { theme } = useTheme();
  const { messages, isLoading, sendMessage } = useChat();
  const location = useLocation();

  React.useEffect(() => {
    const initialMessage = location.state?.message;
    if (initialMessage) {
      handleSendMessage(initialMessage);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content, []);
    } catch (error) {
      console.error('Message send failed:', error);
    }
  };

  return (
    <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <header className={`p-4 border-b flex items-center gap-3 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <Stethoscope className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
        <h1 className={`text-lg font-semibold ${
          theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
        }`}>
          Healthcare Assistant
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`max-w-3xl p-4 rounded-lg ${
            message.sender === 'bot' 
              ? `${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} ml-4`
              : `${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'} mr-4`
          }`}>
            <MessageContent message={message} theme={theme} />
          </div>
        ))}
        
        {isLoading && (
          <div className={`max-w-3xl p-4 rounded-lg ml-4 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            <div className="animate-pulse space-y-3">
              <div className={`h-4 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <div className={`h-4 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <div className={`h-4 w-2/3 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
            </div>
          </div>
        )}
      </main>

      <footer className={`p-4 border-t ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            placeholder="Type your message..."
            className={`flex-1 p-2 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
          <button className={`px-4 py-2 rounded-lg ${
            theme === 'dark' 
              ? 'bg-blue-700 hover:bg-blue-600 text-white' 
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}>
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
export {Chatbot};