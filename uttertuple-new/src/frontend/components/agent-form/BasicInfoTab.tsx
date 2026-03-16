import React from 'react';
import { CreateAgentData, CollectionField } from '../../services/agent';
import CollectionFieldsEditor from '../CollectionFieldsEditor';

interface BasicInfoTabProps {
  formData: CreateAgentData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onCollectionFieldsChange: (fields: CollectionField[]) => void;
  darkMode: boolean;
}

const BasicInfoTab: React.FC<BasicInfoTabProps> = ({ formData, onInputChange, onCollectionFieldsChange, darkMode }) => {
  return (
    <>
      <div>
        <label htmlFor="name" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>
          Agent Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={onInputChange}
          className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${
            darkMode ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500' : 'border-neutral-300 focus:ring-primary-500'
          }`}
          required
        />
      </div>

      <div>
        <label htmlFor="instructions" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>
          Instructions <span className="text-red-500">*</span>
        </label>
        <textarea
          id="instructions"
          name="instructions"
          value={formData.instructions}
          onChange={onInputChange}
          className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 min-h-[120px] shadow-sm ${
            darkMode ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500' : 'border-neutral-300 focus:ring-primary-500'
          }`}
          required
        />
        <p className={`text-xs mt-1.5 ${darkMode ? 'text-gray-400' : 'text-neutral-500'}`}>
          Detailed instructions for the agent to follow. Be specific about how it should behave and respond.
        </p>
      </div>

      <CollectionFieldsEditor
        fields={formData.collection_fields || []}
        onChange={onCollectionFieldsChange}
        darkMode={darkMode}
      />
    </>
  );
};

export default BasicInfoTab; 