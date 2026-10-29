import React from 'react';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { Notification } from '../../types';

interface NotificationsListProps {
  notifications: Notification[];
  theme: 'light' | 'dark';
}

const NotificationsList = ({ notifications, theme }: NotificationsListProps) => {
  return (
    <div className={`rounded-lg transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border`}>
      <h3 className={`text-lg font-semibold mb-4 ${
        theme === 'dark' ? 'text-white' : 'text-gray-900'
      }`}>
        Notifications
      </h3>

      <div className="space-y-3">
        {notifications.map(notification => (
          <div
            key={notification._id}
            className={`p-3 rounded-md transition-colors duration-300 ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {notification.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsList;