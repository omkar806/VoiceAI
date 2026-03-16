import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, LucideIcon } from 'lucide-react';

interface ActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color?: string;
}

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  href,
  icon,
  color = 'bg-primary-50 text-primary-600'
}) => {
  // Split color string to get background and text colors
  const [bgColor, textColor] = color.split(' ');
  
  return (
    <Link href={href}>
      <motion.div 
        whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-lg border border-neutral-200 p-6 h-full"
      >
        <div className={`rounded-full w-10 h-10 flex items-center justify-center ${color} mb-4`}>
          {icon}
        </div>
        <h3 className="text-lg font-medium text-neutral-800 mb-2">{title}</h3>
        <p className="text-neutral-500 text-sm mb-4">{description}</p>
        <div className="flex items-center text-primary-600 text-sm font-medium">
          <span>View</span>
          <ArrowRight className="ml-1 h-4 w-4" />
        </div>
      </motion.div>
    </Link>
  );
};

export default ActionCard; 