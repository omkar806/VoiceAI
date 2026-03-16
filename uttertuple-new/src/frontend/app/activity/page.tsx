'use client';
import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { Activity, Calendar, Search } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { useTheme } from '../../contexts/ThemeContext';

interface ActivityItem {
  id: string;
  type: 'agent' | 'rag' | 'workflow';
  action: string;
  timestamp: string;
  user: string;
  details: string;
}

const ActivityPage: NextPage = () => {
  const { darkMode } = useTheme();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mock data for demonstration
  useEffect(() => {
    // This would be replaced with an actual API call
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'agent',
        action: 'created',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        user: 'John Doe',
        details: 'Created a new customer service agent'
      },
      {
        id: '2',
        type: 'workflow',
        action: 'modified',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        user: 'Jane Smith',
        details: 'Updated banking workflow connections'
      },
      {
        id: '3',
        type: 'rag',
        action: 'deleted',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        user: 'Bob Johnson',
        details: 'Removed outdated knowledge base'
      }
    ];

    setTimeout(() => {
      setActivities(mockActivities);
      setIsLoading(false);
    }, 500);
  }, []);

  // Filter activities based on search query
  const filteredActivities = activities.filter(activity => 
    activity.type.includes(searchQuery.toLowerCase()) ||
    activity.action.includes(searchQuery.toLowerCase()) ||
    activity.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.details.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getActivityTypeColor = (type: string) => {
    switch(type) {
      case 'agent':
        return darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700';
      case 'rag':
        return darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700';
      case 'workflow':
        return darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700';
      default:
        return darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <MainLayout>
      <div className={`flex flex-col h-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        {/* Page header */}
        <div className={`py-6 px-8 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center">
              <Activity className="h-6 w-6 mr-2" />
              Activity
            </h1>
            <div className={`relative w-64 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full py-2 pl-8 pr-3 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Activity list */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${
                darkMode ? 'border-blue-400' : 'border-blue-600'
              }`}></div>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-64 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <Calendar className="h-12 w-12 mb-3" />
              <p className="text-lg font-medium">No activities found</p>
              <p className="text-sm mt-1">
                {searchQuery ? 'Try changing your search query' : 'Activities will appear here as they occur'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <div 
                  key={activity.id} 
                  className={`p-4 rounded-lg border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } shadow-sm transition-all hover:shadow-md`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      <div className={`px-2 py-1 rounded text-xs font-medium uppercase ${getActivityTypeColor(activity.type)}`}>
                        {activity.type}
                      </div>
                      <div className="ml-3">
                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {activity.user}
                        </div>
                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {activity.action} - {activity.details}
                        </div>
                      </div>
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatTimestamp(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ActivityPage; 