import React from 'react';
import { Message } from '../../types/index';

interface MessageContentProps {
  message: Message;
  theme: 'light' | 'dark';
}

export function MessageContent({ message, theme }: MessageContentProps) {
  const baseMessageStyle = {
    maxWidth: '100%',
    padding: '16px',
    borderRadius: '16px',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  };

  // Format the content with styled headings and lists
  const formatContent = (content: string) => {
    const textColor = theme === 'dark' ? '#E5E7EB' : '#1E293B';
    const borderColor = theme === 'dark' ? '#374151' : '#E2E8F0';
    const subheadingColor = theme === 'dark' ? '#93C5FD' : '#3B82F6';
    const listColor = theme === 'dark' ? '#9CA3AF' : '#475569';
    const listDotColor = theme === 'dark' ? '#6B7280' : '#CBD5E1';

    // Remove specified characters from the response
    let formattedContent = content.replace(/[:\-]/g, '');

    // Style main headings (###)
    formattedContent = formattedContent.replace(
      /### (.*?)(?=\n|$)/g,
      `<div style="font-size: 1.15rem; font-weight: 600; color: ${textColor}; padding-bottom: 0.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid ${borderColor};">$1</div><div style="padding-left: 12px;">`
    );

    // Close the indented content div before the next main heading
    formattedContent = formattedContent.replace(
      /(?=###|$)/g,
      '</div>'
    );

    // Style subheadings (**)
    formattedContent = formattedContent.replace(
      /\*\*(.*?)\*\*/g,
      `<div style="font-size: 1rem; font-weight: 500; color: ${subheadingColor}; margin: 0.4rem 0 0.2rem 0;">$1</div>`
    );

    // Style list items with minimal design
    formattedContent = formattedContent.replace(
      /^(\d+\.\s|\*\s|-\s)(.*?)$/gm,
      `<div style="display: flex; align-items: baseline; margin: 0.2rem 0;">
        <span style="width: 4px; height: 4px; background: ${listDotColor}; border-radius: 50%; margin-right: 10px; margin-top: 8px; flex-shrink: 0;"></span>
        <span style="color: ${listColor}; flex: 1;">$2</span>
      </div>`
    );

    return formattedContent;
  };

  const messageContent = message.content || '';

  if (message.role === 'user') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '12px',
        paddingLeft: '20%'
      }}>
        <div style={{
          ...baseMessageStyle,
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          color: '#ffffff',
          borderRadius: '16px 16px 4px 16px',
        }}>
          <div style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {messageContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-start',
      marginBottom: '12px',
      paddingRight: '20%'
    }}>
      <div style={{
        ...baseMessageStyle,
        background: theme === 'dark' ? '#1F2937' : '#ffffff',
        color: theme === 'dark' ? '#F3F4F6' : '#1a1a1a',
        borderRadius: '16px 16px 16px 4px',
      }}>
        <div 
          style={{ 
            margin: 0, 
            whiteSpace: 'pre-wrap',
          }}
          dangerouslySetInnerHTML={{ __html: formatContent(messageContent) }}
        />
      </div>
    </div>
  );
}