import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Award, Gift, Coins, Users, Calendar, Heart, ChevronRight, ChevronLeft, Clock, UserCheck, X } from 'lucide-react';
import { LoyaltyProgramModal } from '../components/LoyaltyProgramModal';
import CampaignCreation from '../components/loyalty/CampaignCreation';
import Dashboard from '../components/loyalty/Dashboard';
import Header from '../components/loyalty/Header';
import QuickStats from '../components/loyalty/QuickStats';
import StatsPanel from '../components/loyalty/StatsPanel';
import Sidebar from '../components/layout/Sidebar';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  Space,
  Card,
  Typography,
  Tag,
  message,
  Select,
  Row,
  Col,
  Statistic,
  Progress,
  Dropdown,
  MenuProps,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { CardProps } from 'antd';
import type { SelectProps } from 'antd';
import RewardTemplates from '../components/loyalty/RewardTemplates';
import { useTheme } from '../contexts/ThemeContext';

const { Title } = Typography;

interface CustomRule {
  triggerType: string;
  pointsAwarded: number;
}

interface Reward {
  name: string;
  pointsRequired: number;
  rewardType: string;
  quantity?: number;
  redemptionRules?: string;
}

interface LoyaltyProgram {
  _id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'inactive';
  pointsPerVisit: number;
  pointsPerReferral: number;
  rewardThreshold: number;
  rewardValue: number;
  pointValidity: number; // in days
  pointsExpiration: number;
  enrollmentCap?: number;
  autoEnroll: boolean;
  notificationsEnabled: boolean;
  termsAndConditions?: string;
  customRules?: CustomRule[];
  rewards?: Reward[];
  eligibilityCriteria?: string[];
  notificationSettings?: {
    earnPoints: boolean;
    rewardsAvailable: boolean;
    pointsExpiring: boolean;
    channels: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  messageTemplate?: string;
}

interface LoyaltyStats {
  totalPrograms: number;
  activePrograms: number;
  totalPatients: number;
  totalPoints: number;
  rewardsRedeemed: number;
}

interface LoyaltyCampaign {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  reward: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'inactive' | 'expired';
}

export interface CampaignForm {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  pointsStructure: {
    appointments: number;
    preventiveCare: number;
    annualCheckups: number;
    referrals: number;
  };
  healthGoals: string[]; // Change from never[] to string[]
  rewards: string[]; // Change from never[] to string[]
}

const Loyalty = () => {
  const { theme } = useTheme();
  const [stats, setStats] = useState<LoyaltyStats>({
    totalPrograms: 0,
    activePrograms: 0,
    totalPatients: 0,
    totalPoints: 0,
    rewardsRedeemed: 0
  });

  useEffect(() => {
    const fetchLoyaltyData = async () => {
      try {
        const statsRes = await axios.get('/api/loyalty/stats');
        if (statsRes?.data) {
          setStats(statsRes.data);
        }
      } catch (error) {
        console.error('Error fetching loyalty data:', error);
      }
    };
    
    fetchLoyaltyData();
  }, []);

  // Dropdown menu items
  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: 'Edit Program',
      icon: <EditOutlined />,
    },
    {
      key: 'delete',
      label: 'Delete Program',
      icon: <DeleteOutlined />,
      danger: true,
    },
  ];

  return (
    <div className={`page-transition min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Main Header */}
      <div className={`shadow-sm transition-colors duration-300 ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Loyalty Program
              </h1>
              <p className={`mt-1 text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Manage your loyalty rewards
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className={`transition-colors duration-300 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border`}>
            <Statistic
              title={<span style={{ color: theme === 'dark' ? '#fff' : '#6b7280' }}>Active Rewards</span>}
              value={stats.activePrograms}
              prefix={<Gift className={`h-5 w-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />}
              valueStyle={{ color: theme === 'dark' ? '#fff' : '#111827' }}
            />
          </Card>
          <Card className={`transition-colors duration-300 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border`}>
            <Statistic
              title={<span style={{ color: theme === 'dark' ? '#fff' : '#6b7280' }}>Total Patients</span>}
              value={stats.totalPatients}
              prefix={<Users className={`h-5 w-5 ${
                theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
              }`} />}
              valueStyle={{ color: theme === 'dark' ? '#fff' : '#111827' }}
            />
          </Card>
          <Card className={`transition-colors duration-300 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border`}>
            <Statistic
              title={<span style={{ color: theme === 'dark' ? '#fff' : '#6b7280' }}>Total Points</span>}
              value={stats.totalPoints}
              prefix={<Coins className={`h-5 w-5 ${
                theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
              }`} />}
              valueStyle={{ color: theme === 'dark' ? '#fff' : '#111827' }}
            />
          </Card>
          <Card className={`transition-colors duration-300 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border`}>
            <Statistic
              title={<span style={{ color: theme === 'dark' ? '#fff' : '#6b7280' }}>Rewards Redeemed</span>}
              value={stats.rewardsRedeemed}
              prefix={<Award className={`h-5 w-5 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} />}
              valueStyle={{ color: theme === 'dark' ? '#fff' : '#111827' }}
            />
          </Card>
        </div>

        {/* Reward Templates Section */}
        <div className={`mb-8 p-6 rounded-lg transition-colors duration-300 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border`}>
          <h4 className={`text-lg font-semibold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Available Reward Templates
          </h4>
          <RewardTemplates theme={theme} />
        </div>
      </div>
    </div>
  );
};

export default Loyalty;
