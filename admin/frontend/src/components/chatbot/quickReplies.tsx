import React from 'react';
import { QuickReply } from '../../types/index';
import { Stethoscope, Pill, CalendarCheck, HelpCircle } from 'lucide-react';

interface QuickRepliesProps {
  onSelect: (reply: QuickReply) => void;
}

const quickReplies: QuickReply[] = [
  { id: '1', text: 'Patient History', category: 'diagnosis' },
  { id: '2', text: 'Medication Review', category: 'prescription' },
  { id: '3', text: 'Schedule Follow-up', category: 'followup' },
  { id: '4', text: 'General Inquiry', category: 'general' },
];

const categoryIcons = {
  diagnosis: Stethoscope,
  prescription: Pill,
  followup: CalendarCheck,
  general: HelpCircle,
};

export function QuickReplies({ onSelect }: QuickRepliesProps) {
  return (
    <div className="flex gap-2 p-4 overflow-x-auto">
      {quickReplies.map((reply) => {
        const Icon = categoryIcons[reply.category];
        return (
          <button
            key={reply.id}
            onClick={() => onSelect(reply)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <Icon className="w-4 h-4" />
            {reply.text}
          </button>
        );
      })}
    </div>
  );
}