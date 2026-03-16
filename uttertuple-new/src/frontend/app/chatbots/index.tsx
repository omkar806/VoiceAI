import React from 'react';
import { NextPage } from 'next';
import Link from 'next/link';
import { Plus, MessageSquare } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import MainLayout from '../../components/layout/MainLayout';
import { useTheme } from '../../contexts/ThemeContext';

const ChatbotsPage: NextPage = () => {
  // Mock data
  const hasChatbots = true;
  const { darkMode } = useTheme();
  
  const mockChatbots = [
    { id: '1', name: 'Banking Assistant', interactions: 1245, lastModified: '2 days ago' },
    { id: '2', name: 'Customer Support', interactions: 876, lastModified: '5 days ago' },
    { id: '3', name: 'Sales Bot', interactions: 542, lastModified: '1 week ago' },
  ];

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Chatbots</h1>
          <Link href="/chatbots/create">
            <Button leftIcon={<Plus className="h-4 w-4" />} size="md">
              Create Chatbot
            </Button>
          </Link>
        </div>
        
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">
          Deploy and manage AI chatbots for your website or applications
        </p>
        
        {!hasChatbots ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-primary-50 dark:bg-primary-900/30 p-4 rounded-full mb-4">
              <MessageSquare className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-xl font-medium text-neutral-800 dark:text-neutral-200 mb-2">Create Your First Chatbot</h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-center max-w-md mb-6">
              You haven't created any chatbots yet. Deploy AI assistants as embeddable widgets.
            </p>
            <Link href="/chatbots/create">
              <Button size="lg" leftIcon={<Plus className="h-5 w-5" />}>
                Create Chatbot
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockChatbots.map((bot) => (
              <Card key={bot.id} className="hover:shadow-lg transition-shadow">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">{bot.name}</h3>
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-primary-700 dark:text-primary-400" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400">
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                      <span className="font-medium">Interactions:</span> {bot.interactions}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500">
                      Last modified: {bot.lastModified}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-between">
                    <Link href={`/chatbots/${bot.id}/analytics`}>
                      <Button variant="ghost" size="sm">
                        Analytics
                      </Button>
                    </Link>
                    <Link href={`/chatbots/${bot.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Settings
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ChatbotsPage; 