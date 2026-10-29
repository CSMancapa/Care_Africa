import React, { useState, useRef } from 'react';
import { Send, Image, Paperclip } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() || files.length > 0) {
      onSend(message, files);
      setMessage('');
      setFiles([]);
      setPreviews([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
    
    // Create previews for images
    selectedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full dark:bg-gray-900">
      {/* File Previews */}
      {previews.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto p-2 dark:bg-gray-800 dark:border-gray-700">
          {previews.map((preview, index) => (
            <div key={index} className="relative">
              <img 
                src={preview} 
                alt="preview" 
                className="h-20 w-20 object-cover rounded-lg dark:border dark:border-gray-600"
              />
              <button
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
              >
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt"
        />
        <input
          type="file"
          ref={imageInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
          multiple
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
          title="Attach image"
        >
          <Image className="h-5 w-5" />
        </button>

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:border-blue-500"
        />
        
        <button
          type="submit"
          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          disabled={!message.trim() && files.length === 0}
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}