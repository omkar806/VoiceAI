import React from 'react';
import { NextPage } from 'next';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';

const FaqPage: NextPage = () => {
  const faqItems = [
    {
      question: 'What is an AI agent?',
      answer: 'An AI agent is a system that can perceive its environment, make decisions, and take actions based on those decisions. In our platform, agents are specialized AI assistants that can handle specific tasks through natural conversation.'
    },
    {
      question: 'How do I create a new agent?',
      answer: 'To create a new agent, navigate to the "My Agents" page and click on the "Create Agent" button. Fill in the required fields like name, instructions, and any custom tools you want the agent to use.'
    },
    {
      question: 'What are custom tools?',
      answer: 'Custom tools allow your agents to perform specific actions or access particular data sources. You can define tools that let agents query databases, call APIs, or transition to other agents in a workflow.'
    },
    {
      question: 'What is a multi-agent workflow?',
      answer: 'A multi-agent workflow connects multiple specialized agents together. This allows for complex conversations where different parts of the interaction can be handled by agents with different expertise or capabilities.'
    },
    {
      question: 'How do I build a workflow?',
      answer: 'Go to the "Workflows" page and click "Create Workflow". Use the visual flow builder to drag agents onto the canvas, connect them, and define the conditions for transitions between agents.'
    },
    {
      question: 'What LLM models are supported?',
      answer: 'We currently support various OpenAI models (GPT-4o, GPT-4o-mini, etc.) and Anthropic models (Claude 3 Sonnet, Claude 3 Opus). More models will be added in the future.'
    },
    {
      question: 'Can I customize the voice of my agent?',
      answer: 'Yes, you can assign a specific voice ID to each agent when creating or editing them. This allows for a more personalized and distinct conversation experience.'
    }
  ];

  return (
    <MainLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-800 mb-2">Frequently Asked Questions</h1>
        <p className="text-neutral-600 mb-8">Find answers to common questions about using the Agent Hub platform.</p>
        
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="p-4 border-l-4 border-primary-500">
                <h3 className="text-lg font-medium text-neutral-800 mb-2">{item.question}</h3>
                <p className="text-neutral-600">{item.answer}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default FaqPage; 