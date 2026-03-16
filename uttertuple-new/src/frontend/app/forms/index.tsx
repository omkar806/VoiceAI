import React from 'react';
import { NextPage } from 'next';
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import MainLayout from '../../components/layout/MainLayout';

const FormsPage: NextPage = () => {
  // Mock data
  const hasForms = true;
  
  const mockForms = [
    { id: '1', name: 'Customer Satisfaction', responses: 156, lastModified: '2 days ago' },
    { id: '2', name: 'Product Feedback', responses: 89, lastModified: '5 days ago' },
    { id: '3', name: 'Support Request', responses: 42, lastModified: '1 week ago' },
  ];

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-neutral-800">Interactive Forms</h1>
          <Link href="/forms/create">
            <Button leftIcon={<Plus className="h-4 w-4" />} size="md">
              Create Form
            </Button>
          </Link>
        </div>
        
        <p className="text-neutral-600 mb-8">
          Create interactive forms that can be filled with AI assistance
        </p>
        
        {!hasForms ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="bg-primary-50 p-4 rounded-full mb-4">
              <FileText className="h-8 w-8 text-primary-600" />
            </div>
            <h2 className="text-xl font-medium text-neutral-800 mb-2">Create Your First Form</h2>
            <p className="text-neutral-600 text-center max-w-md mb-6">
              You haven't created any forms yet. Build interactive forms with AI assistance.
            </p>
            <Link href="/forms/create">
              <Button size="lg" leftIcon={<Plus className="h-5 w-5" />}>
                Create Form
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockForms.map((form) => (
              <Card key={form.id} className="hover:shadow-lg transition-shadow">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-neutral-800">{form.name}</h3>
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary-700" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm text-neutral-600 mb-4">
                      <span className="font-medium">Responses:</span> {form.responses}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Last modified: {form.lastModified}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-neutral-200 flex justify-between">
                    <Link href={`/forms/${form.id}/responses`}>
                      <Button variant="ghost" size="sm">
                        View Responses
                      </Button>
                    </Link>
                    <Link href={`/forms/${form.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
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

export default FormsPage; 