import React, { useEffect, useState } from 'react';
import { BarChart, Users, Gift, AlertTriangle } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTheme } from '../../contexts/ThemeContext';

interface Campaign {
  id: string;
  name: string;
  status: string;
  participation: string;
  points: string;
}

interface Alert {
  type: 'warning' | 'info';
  message: string;
}

interface DashboardProps {
  alerts?: Alert[];
}

const Dashboard: React.FC<DashboardProps> = ({ 
  alerts = [
    {
      type: 'warning',
      message: 'Spring Campaign ending in 3 days',
    },
    {
      type: 'info',
      message: 'New customer segment identified',
    },
  ]
}) => {
  const { theme } = useTheme();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const campaignsRef = collection(db, 'campaigns');
        const q = query(campaignsRef, where('status', '==', 'active'));
        const querySnapshot = await getDocs(q);
        
        const activeCampaigns = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          status: doc.data().status,
          participation: '0%', // You might want to calculate this based on actual data
          points: '0', // You might want to calculate this based on actual rewards
          ...doc.data()
        }));
        
        setCampaigns(activeCampaigns);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  return (
    <div className={`flex-1 p-8 overflow-auto transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-7xl mx-auto">
        <h1 className={`text-2xl font-bold mb-8 transition-colors duration-300 ${
          theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
        }`}>
          Dashboard
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className={`rounded-lg p-6 shadow-sm transition-colors duration-300 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
              }`}>
                Active Campaigns
              </h3>
              <BarChart className={`w-5 h-5 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${
                      theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                    }`}>
                      {campaign.name}
                    </p>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Participation: {campaign.participation}
                    </p>
                  </div>
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`}>
                    {campaign.points} pts
                  </span>
                </div>
              ))}
              {campaigns.length === 0 && (
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  No active campaigns
                </p>
              )}
            </div>
          </div>

          <div className={`rounded-lg p-6 shadow-sm transition-colors duration-300 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
              }`}>
                Customer Activity
              </h3>
              <Users className={`w-5 h-5 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className={`text-xs font-semibold inline-block py-1 px-2 rounded-full ${
                    theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-200 text-blue-600'
                  }`}>
                    Active Users
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold ${
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                  }`}>
                    78%
                  </span>
                </div>
              </div>
              <div className={`overflow-hidden h-2 mb-4 text-xs flex rounded ${
                theme === 'dark' ? 'bg-blue-900' : 'bg-blue-200'
              }`}>
                <div className="w-[78%] shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600"></div>
              </div>
            </div>
          </div>

          <div className={`rounded-lg p-6 shadow-sm transition-colors duration-300 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
              }`}>
                Recent Rewards
              </h3>
              <Gift className={`w-5 h-5 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Rewards Claimed Today
                </p>
                <span className={`font-medium ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                }`}>
                  24
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Points Redeemed
                </p>
                <span className={`font-medium ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                }`}>
                  2,450
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={`rounded-lg p-6 shadow-sm transition-colors duration-300 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
            }`}>
              Alerts
            </h3>
            <AlertTriangle className={`w-5 h-5 ${
              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
            }`} />
          </div>
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg transition-colors duration-300 ${
                  alert.type === 'warning'
                    ? theme === 'dark' 
                      ? 'bg-yellow-900 text-yellow-200' 
                      : 'bg-yellow-50 text-yellow-700'
                    : theme === 'dark'
                      ? 'bg-blue-900 text-blue-200'
                      : 'bg-blue-50 text-blue-700'
                }`}
              >
                {alert.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;