import React, { useState, useEffect } from 'react';
import { Modal, Input, Switch, Form, InputNumber, message, Select, Tabs, Modal as AntModal } from 'antd';
import { rewardTemplates } from '../../data/rewardTemplates';
import { Gift, Award, Heart, Users, Star, Stethoscope, X, ChevronDown } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { pointsToZAR, ZARtoPoints } from '../../utils/pointsConverter';
import { useTheme } from '../../contexts/ThemeContext';

const { Option } = Select;
const { TabPane } = Tabs;
const { confirm } = AntModal;

interface ActiveCampaign {
  _id: string;
  templateName: string;
  category: string;
  points: number;
  value: number;
  description: string;
  isActive: boolean;
}

// Flatten templates and add category info
const allTemplates = rewardTemplates.flatMap(category => 
  category.templates.map(template => ({
    ...template,
    category: category.category
  }))
);

const categoryIcons: { [key: string]: any } = {
  'General Healthcare Rewards': {
    icon: Stethoscope,
    color: 'text-blue-500'
  },
  'Preventative Care Rewards': {
    icon: Heart,
    color: 'text-red-500'
  },
  'Wellness Perks': {
    icon: Star,
    color: 'text-yellow-500'
  },
  'Specialized Rewards': {
    icon: Award,
    color: 'text-orange-500'
  },
  'Family & Community-Oriented Rewards': {
    icon: Users,
    color: 'text-green-500'
  },
  'Patient Appreciation Rewards': {
    icon: Gift,
    color: 'text-pink-500'
  }
};

interface RewardTemplatesProps {
  theme: 'light' | 'dark';
}

const RewardTemplates: React.FC<RewardTemplatesProps> = () => {
  const { theme } = useTheme();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());
  const [form] = Form.useForm();
  const [activeCampaigns, setActiveCampaigns] = useState<ActiveCampaign[]>([]);
  const [currentPoints, setCurrentPoints] = useState<number>(0);
  const [currentValue, setCurrentValue] = useState<number>(0);

  useEffect(() => {
    fetchActiveCampaigns();
  }, []);

  const BASE_URL = 'http://localhost:5001';

  const fetchActiveCampaigns = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const response = await fetch(`${BASE_URL}/api/campaigns/active?doctorId=${user.uid}`);
      const data = await response.json();
      setActiveCampaigns(data);
    } catch (error) {
      console.error('Error fetching active campaigns:', error);
    }
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? allTemplates 
    : allTemplates.filter(template => template.category === selectedCategory);

  const handleCustomize = (template: any) => {
    setSelectedTemplate(template);
    const initialPoints = Number(template.example.split('=')[0].match(/\d+/)[0]);
    setCurrentPoints(initialPoints);
    setCurrentValue(pointsToZAR(initialPoints));
    form.setFieldsValue({
      points: initialPoints,
      value: pointsToZAR(initialPoints),
      isActive: false,
      description: template.example.split('=')[1].trim(),
    });
    setIsModalVisible(true);
  };

  const handleSave = async (values: any) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');

      const campaignData = {
        doctorId: user.uid,
        templateName: selectedTemplate.name,
        category: selectedTemplate.category,
        points: values.points,
        value: currentValue,
        description: values.description,
        isActive: values.isActive || false,
        status: 'active'
      };

      console.log('Sending campaign data:', campaignData);

      const response = await fetch(`${BASE_URL}/api/campaigns/active`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.message || 'Failed to save campaign');
      }

      message.success('Template activated successfully');
      setIsModalVisible(false);
      fetchActiveCampaigns();
    } catch (error) {
      console.error('Save error:', error);
      message.error('Failed to activate template');
    }
  };

  const deactivateCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/campaigns/active/${campaignId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to deactivate campaign');

      message.success('Campaign deactivated successfully');
      fetchActiveCampaigns();
    } catch (error) {
      message.error('Failed to deactivate campaign');
    }
  };

  const toggleDescription = (index: number) => {
    const newExpanded = new Set(expandedDescriptions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedDescriptions(newExpanded);
  };

  const handlePointsChange = (points: number | null) => {
    if (points) {
      const zarValue = pointsToZAR(points);
      setCurrentPoints(points);
      setCurrentValue(zarValue);
      form.setFieldsValue({ value: zarValue });
    } else {
      setCurrentPoints(0);
      setCurrentValue(0);
    }
  };

  const showDeactivateConfirm = (campaignId: string, templateName: string) => {
    confirm({
      title: 'Deactivate Reward Campaign',
      content: `Are you sure you want to deactivate "${templateName}"?`,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk() {
        deactivateCampaign(campaignId);
      },
    });
  };

  const handleEdit = (campaign: ActiveCampaign) => {
    setSelectedTemplate({
      name: campaign.templateName,
      category: campaign.category,
    });
    setCurrentPoints(campaign.points);
    setCurrentValue(campaign.value);
    form.setFieldsValue({
      points: campaign.points,
      value: campaign.value,
      description: campaign.description,
      isActive: campaign.isActive,
    });
    setIsModalVisible(true);
  };

  return (
    <div className={`p-4 rounded-lg transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
    }`}>
      <Tabs 
        defaultActiveKey="templates" 
        className={`rounded-lg shadow-sm ${
          theme === 'dark' ? 'bg-gray-700' : 'bg-white'
        }`}
      >
        <TabPane 
          tab={
            <span className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Available Templates
            </span>
          } 
          key="templates"
        >
          {/* Category Filter */}
          <div className="flex items-center gap-4 mb-8 px-4">
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              className={`w-64 ${
                theme === 'dark' 
                  ? '[&_.ant-select-selector]:bg-gray-800 [&_.ant-select-selector]:border-gray-700 [&_.ant-select-selection-item]:text-white' 
                  : ''
              }`}
              popupClassName={theme === 'dark' ? 'dark-dropdown' : ''}
              suffixIcon={
                <ChevronDown className={`w-4 h-4 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                }`} />
              }
            >
              <Option value="all" className={theme === 'dark' ? 'text-gray-200' : ''}>
                All Categories
              </Option>
              {rewardTemplates.map(category => (
                <Option 
                  key={category.category} 
                  value={category.category}
                  className={theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'hover:bg-gray-100'}
                >
                  {category.category}
                </Option>
              ))}
            </Select>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 pb-4">
            {filteredTemplates.map((template, index) => {
              const CategoryIcon = categoryIcons[template.category]?.icon || Gift;
              const isExpanded = expandedDescriptions.has(index);
              
              return (
                <div 
                  key={index} 
                  className={`rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-white'
                  }`}
                >
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <CategoryIcon className={`w-5 h-5 ${
                        categoryIcons[template.category]?.color || 'text-gray-500'
                      }`} />
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {template.category}
                      </span>
                    </div>
                    
                    <h4 className={`text-lg font-semibold mb-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      {template.name}
                    </h4>
                    
                    <div className="flex-1 flex flex-col">
                      <p className={`mb-4 ${isExpanded ? '' : 'line-clamp-3'} ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {template.example}
                      </p>
                      {template.example.length > 150 && (
                        <button
                          onClick={() => toggleDescription(index)}
                          className={`text-sm mb-4 ${
                            theme === 'dark' 
                              ? 'text-blue-400 hover:text-blue-300' 
                              : 'text-blue-600 hover:text-blue-700'
                          }`}
                        >
                          {isExpanded ? 'Show less' : 'View more'}
                        </button>
                      )}
                    </div>

                    <div className="mt-auto">
                      <button
                        onClick={() => handleCustomize(template)}
                        className={`w-full py-3 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 ${
                          theme === 'dark'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <Gift className="w-4 h-4" />
                        <span>Customize & Activate</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabPane>
        
        <TabPane 
          tab={
            <span className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Active Campaigns
            </span>
          } 
          key="active"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 pb-4">
            {activeCampaigns.map((campaign) => {
              const CategoryIcon = categoryIcons[campaign.category]?.icon || Gift;
              
              return (
                <div 
                  key={campaign._id} 
                  className={`rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-white'
                  }`}
                >
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className={`w-5 h-5 ${
                          categoryIcons[campaign.category]?.color || 'text-gray-500'
                        }`} />
                        <span className={`text-sm ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          {campaign.category}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(campaign)}
                          className={`p-2 text-gray-400 hover:text-blue-500 transition-colors ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                          }`}
                          title="Edit campaign"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => showDeactivateConfirm(campaign._id, campaign.templateName)}
                          className={`p-2 text-gray-400 hover:text-red-500 transition-colors ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                          }`}
                          title="Deactivate campaign"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <h4 className={`text-lg font-semibold mb-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      {campaign.templateName}
                    </h4>
                    
                    <div className="flex-1">
                      <p className="text-gray-600 mb-4">{campaign.description}</p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-500">Points Required</p>
                        <p className="text-lg font-semibold text-gray-800">{campaign.points}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-500">Value (R)</p>
                        <p className="text-lg font-semibold text-gray-800">{campaign.value}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabPane>
      </Tabs>

      {/* Customization Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-blue-600" />
            <span>Customize Reward Template</span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={500}
        className={`${theme === 'dark' ? 'dark-modal' : ''}`}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          onValuesChange={(changedValues) => {
            if (changedValues.points !== undefined) {
              handlePointsChange(changedValues.points);
            }
          }}
          className="mt-6"
        >
          <Form.Item
            name="points"
            label="Points Required"
            rules={[{ required: true }]}
          >
            <InputNumber 
              min={0} 
              className="w-full"
              value={currentPoints}
              onChange={handlePointsChange}
            />
          </Form.Item>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Reward Value</p>
            <p className="text-lg font-semibold text-gray-800">
              R{currentValue.toFixed(2)}
            </p>
          </div>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsModalVisible(false)}
              className={`px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
                theme === 'dark' ? 'bg-blue-700' : 'bg-blue-600'
              }`}
            >
              Save Changes
            </button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default RewardTemplates; 