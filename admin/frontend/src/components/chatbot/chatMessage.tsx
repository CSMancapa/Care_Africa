import React from 'react';
import { format } from 'date-fns';
import { User, Bot } from 'lucide-react';
import { Message, Attachment } from '../../types/index';
import { cn } from '../../lib/utils';
import { AttachmentPreview } from './attachmentPreview';
import { MessageContent } from './messageContent';

interface ChatMessageProps {
  message: Message;
  theme: 'light' | 'dark';
}

export function ChatMessage({ message, theme }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn(
      "flex w-full gap-4 p-4 bg-white dark:bg-gray-900",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "h-8 w-8 shrink-0 select-none items-center justify-center rounded-full",
        isUser ? "bg-blue-600" : "bg-gray-100 dark:bg-gray-800"
      )}>
        {isUser ? (
          <User className="h-5 w-5 text-white" />
        ) : (
          <Bot className="h-5 w-5 text-gray-600" />
        )}
      </div>
      <div className={cn(
        "flex flex-col gap-2 max-w-[80%]",
        isUser && "items-end"
      )}>
        <MessageContent message={message} theme={theme} />
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments?.map((attachment: Attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}
        <span className={`text-xs ${
          isUser ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
        }`}>
          {format(message.timestamp, 'HH:mm')}
        </span>
      </div>
    </div>
  );
}