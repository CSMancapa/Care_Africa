import React from 'react';
import { Bell, Mail, Calendar } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface Task {
  id: string;
  type: 'reminder' | 'email' | 'follow-up';
  description: string;
  dueDate: Date;
  status: 'pending' | 'completed' | 'failed';
}

interface AutomatedTasksProps {
  tasks: Task[];
  onTaskComplete: (taskId: string) => void;
}

const AutomatedTasks: React.FC<AutomatedTasksProps> = ({ tasks, onTaskComplete }) => {
  const { theme } = useTheme();

  const getTaskIcon = (type: Task['type']) => {
    switch (type) {
      case 'reminder':
        return <Bell className="w-5 h-5" />;
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'follow-up':
        return <Calendar className="w-5 h-5" />;
    }
  };

  return (
    <div className={`rounded-xl shadow-sm transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100/50'
    } border`}>
      <div className={`p-6 border-b transition-colors duration-300 ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
      }`}>
        <h2 className={`text-lg font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Automated Tasks
        </h2>
      </div>
      
      <div className="divide-y transition-colors duration-300">
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className={`p-4 transition-colors duration-300 ${
              theme === 'dark' ? 'divide-gray-700 hover:bg-gray-700' : 'divide-gray-100 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg transition-colors duration-300 ${
                  task.type === 'reminder' ? 
                    theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600' :
                  task.type === 'email' ? 
                    theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600' :
                    theme === 'dark' ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600'
                }`}>
                  {getTaskIcon(task.type)}
                </div>
                <div>
                  <p className={`font-medium ${
                    theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    {task.description}
                  </p>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Due: {task.dueDate.toLocaleDateString()}
                  </p>
                </div>
              </div>
              {task.status === 'pending' && (
                <button
                  onClick={() => onTaskComplete(task.id)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors duration-300 ${
                    theme === 'dark' 
                      ? 'text-blue-400 hover:bg-blue-900/30' 
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Complete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AutomatedTasks;