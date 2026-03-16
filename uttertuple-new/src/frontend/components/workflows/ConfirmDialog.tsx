import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  darkMode?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  darkMode = false
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onCancel}
    >
      <div 
        className={`w-full max-w-md p-6 rounded-lg shadow-xl animate-fadeIn ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center mb-4">
          <div className={`${
            darkMode ? 'bg-red-900/30' : 'bg-red-100'
          } p-2 rounded-full mr-3`}>
            <AlertCircle className={`${
              darkMode ? 'text-red-400' : 'text-red-600'
            } h-6 w-6`} />
          </div>
          <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h3>
        </div>
        <p className={`mb-6 break-words max-w-[calc(100%-20px)] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {message}
        </p>
        
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors ${
              darkMode 
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 focus:ring-gray-500' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors ${
              darkMode 
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog; 