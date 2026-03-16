import React, { useState } from 'react';
import Button from 'antd/lib/button';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import Select from 'antd/lib/select';
import Switch from 'antd/lib/switch';
import Card from 'antd/lib/card';
import Typography from 'antd/lib/typography';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { CollectionField } from '../services/agent';
import ConfigProvider from 'antd/lib/config-provider';
import theme from 'antd/lib/theme';

const { Title } = Typography;
const { Option } = Select;

interface CollectionFieldsEditorProps {
  fields: CollectionField[];
  onChange: (fields: CollectionField[]) => void;
  darkMode?: boolean;
}

const CollectionFieldsEditor: React.FC<CollectionFieldsEditorProps> = ({ fields, onChange, darkMode = false }) => {
  const [newField, setNewField] = useState<CollectionField>({
    name: '',
    type: 'text',
    required: false,
  });

  const handleAddField = () => {
    if (newField.name.trim() === '') return;
    
    onChange([...fields, { ...newField }]);
    setNewField({
      name: '',
      type: 'text',
      required: false,
    });
  };

  const handleRemoveField = (index: number) => {
    const updatedFields = [...fields];
    updatedFields.splice(index, 1);
    onChange(updatedFields);
  };

  const handleFieldChange = (index: number, field: Partial<CollectionField>) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...field };
    onChange(updatedFields);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: darkMode ? '#3b82f6' : '#1060ff',
          colorBgContainer: darkMode ? '#1f2937' : '#ffffff',
          colorBgElevated: darkMode ? '#374151' : '#ffffff',
          colorBorder: darkMode ? '#4b5563' : '#e2e8f0',
          colorText: darkMode ? '#e5e7eb' : '#1e293b',
        },
      }}
    >
      <Card className={`mt-4 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
        <Title level={4} className={darkMode ? 'text-gray-200' : ''}>
          Data Collection Fields (Optional)
        </Title>
        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Optionally configure what information this agent should collect from users
        </p>

        {fields.length > 0 && (
          <div className="mb-4">
            {fields.map((field, index) => (
              <div 
                key={index} 
                className={`flex items-center gap-2 mb-2 p-2 rounded ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}
              >
                <Input
                  placeholder="Field name"
                  className="flex-1"
                  value={field.name}
                  id={`field-name-${index}`}
                  onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                />
                <Select
                  style={{ width: 120 }}
                  value={field.type}
                  id={`field-type-${index}`}
                  onChange={(value) => handleFieldChange(index, { type: value })}
                >
                  <Option value="text">Text</Option>
                  <Option value="number">Number</Option>
                  <Option value="list">List</Option>
                  <Option value="payment">Payment</Option>
                </Select>
                <Switch
                  checkedChildren="Required"
                  unCheckedChildren="Optional"
                  checked={field.required}
                  id={`field-required-${index}`}
                  onChange={(checked) => handleFieldChange(index, { required: checked })}
                />
                <Button
                  type="text"
                  danger
                  onClick={() => handleRemoveField(index)}
                  aria-label="Delete field"
                >
                  <DeleteOutlined />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <Form.Item 
            label={<span className={darkMode ? 'text-gray-300' : ''}>Name</span>} 
            className="mb-0 flex-1"
          >
            <Input
              placeholder="Enter field name"
              value={newField.name}
              id="new-field-name"
              onChange={(e) => setNewField({ ...newField, name: e.target.value })}
            />
          </Form.Item>
          <Form.Item 
            label={<span className={darkMode ? 'text-gray-300' : ''}>Type</span>} 
            className="mb-0"
          >
            <Select
              style={{ width: 120 }}
              value={newField.type}
              id="new-field-type"
              onChange={(value) => setNewField({ ...newField, type: value })}
            >
              <Option value="text">Text</Option>
              <Option value="number">Number</Option>
              <Option value="list">List</Option>
              <Option value="payment">Payment</Option>
            </Select>
          </Form.Item>
          <Form.Item 
            label={<span className={darkMode ? 'text-gray-300' : ''}>Required</span>} 
            className="mb-0"
          >
            <Switch
              checkedChildren="Yes"
              unCheckedChildren="No"
              checked={newField.required}
              id="new-field-required"
              onChange={(checked) => setNewField({ ...newField, required: checked })}
            />
          </Form.Item>
          <Button
            type="primary"
            onClick={handleAddField}
            disabled={!newField.name.trim()}
          >
            <PlusOutlined /> Add Field
          </Button>
        </div>
      </Card>
    </ConfigProvider>
  );
};

export default CollectionFieldsEditor; 