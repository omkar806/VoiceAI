import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Database, Info, Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { VectorDB } from '../../services/rag';

// Define CollectionData interface here since it's not exported from the agent service
interface CollectionData {
  name: string;
  metadata?: {
    file_count: number;
    total_vectors: number;
    descriptions: string[];
    embedding_models: string[];
    last_updated: string | null;
  };
}

interface RagConfigurationTabProps {
  vectorDbs: VectorDB[];
  ragConfigs: { dbId: string; collectionName: string }[];
  collectionsMap: Record<string, CollectionData[]>;
  onAddRagConfig: (dbId: string, collectionName: string) => void;
  onDeleteRagConfig: (index: number) => void;
  darkMode: boolean;
  onFetchCollections?: (dbId: string) => Promise<void>;
}

const RagConfigurationTab: React.FC<RagConfigurationTabProps> = ({
  vectorDbs,
  ragConfigs,
  collectionsMap,
  onAddRagConfig,
  onDeleteRagConfig,
  darkMode,
  onFetchCollections
}) => {
  const [selectedDb, setSelectedDb] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [loadingCollections, setLoadingCollections] = useState(false);

  // Reset collection when db changes
  const handleDbChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dbId = e.target.value;
    setSelectedDb(dbId);
    setSelectedCollection('');
    
    // Show loading state for collections if DB is selected
    if (dbId) {
      setLoadingCollections(true);
      
      // Load collections for this database if not already loaded
      if (!collectionsMap[dbId] && onFetchCollections) {
        try {
          await onFetchCollections(dbId);
        } catch (error) {
          console.error("Error loading collections:", error);
        } finally {
          setLoadingCollections(false);
        }
      } else {
        setLoadingCollections(false);
      }
    }
  };

  // Update loading state when collections data changes
  useEffect(() => {
    if (selectedDb && collectionsMap[selectedDb]) {
      setLoadingCollections(false);
    }
  }, [selectedDb, collectionsMap]);

  const handleCollectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCollection(e.target.value);
  };

  const handleAdd = () => {
    if (selectedDb && selectedCollection) {
      onAddRagConfig(selectedDb, selectedCollection);
      setSelectedDb('');
      setSelectedCollection('');
    }
  };

  return (
    <div className={`border p-4 rounded-lg ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-neutral-200 bg-neutral-50'}`}>
      <h3 className={`font-medium mb-4 ${darkMode ? 'text-white' : 'text-neutral-800'}`}>RAG Configuration</h3>
      <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-neutral-600'}`}>
        Connect your agent to vector databases for Retrieval Augmented Generation (RAG) capabilities.
        You can add multiple configurations to leverage different knowledge bases.
      </p>
      
      {vectorDbs.length === 0 ? (
        <div className="text-center py-6">
          <Database size={36} className={`${darkMode ? 'text-gray-500' : 'text-neutral-400'} mx-auto mb-3`} />
          <p className={`${darkMode ? 'text-gray-400' : 'text-neutral-600'} mb-4`}>No vector databases found</p>
          <Link href="/settings?tab=rag">
            <button className={`flex items-center mx-auto px-4 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-primary-600 hover:bg-primary-700'} text-white rounded-md`}>
              <Plus size={16} className="mr-1.5" /> Add Vector Database
            </button>
          </Link>
        </div>
      ) : (
        <>
          {/* Display existing RAG configurations */}
          {ragConfigs.length > 0 && (
            <div className="space-y-3 mb-6">
              <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-neutral-700'}`}>
                Added Configurations ({ragConfigs.length})
              </h4>
              {ragConfigs.map((config, index) => (
                <div key={`${config.dbId}-${config.collectionName}`} className={`p-4 rounded-md flex items-center justify-between ${darkMode ? 'bg-gray-700' : 'bg-neutral-100'}`}>
                  <div>
                    <div className="font-medium mb-1">
                      {vectorDbs.find(db => db.id === config.dbId)?.name || 'Unknown Database'}
                    </div>
                    <div className="text-sm mb-1">
                      Collection: <span className="font-semibold">{config.collectionName}</span>
                    </div>
                    {/* Show collection metadata if available */}
                    {collectionsMap[config.dbId] && collectionsMap[config.dbId].length > 0 && (
                      (() => {
                        const selectedCollection = collectionsMap[config.dbId].find(c => c.name === config.collectionName);
                        const metadata = selectedCollection?.metadata;
                        if (!metadata) return null;
                        return (
                          <div className={`mt-2 p-3 text-xs rounded ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-neutral-50 text-neutral-700'}`}>
                            <div>Files: {metadata.file_count}, Vectors: {metadata.total_vectors}</div>
                            {metadata.descriptions.length > 0 && <div>Description: {metadata.descriptions.join(' ')}</div>}
                            {metadata.last_updated && <div>Last updated: {new Date(metadata.last_updated).toLocaleDateString()}</div>}
                          </div>
                        );
                      })()
                    )}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => onDeleteRagConfig(index)} 
                    className="ml-4 px-3 py-2 text-red-500 rounded-md flex items-center hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={16} className="mr-1" /> Delete
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Add new RAG configuration form */}
          <div className="space-y-4 mt-6">
            <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-neutral-700'}`}>
              Add New Configuration
            </h4>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>Select Vector Database</label>
              <select
                value={selectedDb}
                onChange={handleDbChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${darkMode ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500' : 'border-neutral-300 focus:ring-primary-500'}`}
              >
                <option value="">Select a database</option>
                {vectorDbs.map(db => (
                  <option key={db.id} value={db.id}>{db.name}</option>
                ))}
              </select>
            </div>
            
            {selectedDb && loadingCollections && (
              <div className={`p-3 rounded-md flex items-center ${darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                <Loader2 size={16} className="mr-2 flex-shrink-0 animate-spin" />
                <p className="text-sm">Loading collections for this database...</p>
              </div>
            )}
            
            {selectedDb && !loadingCollections && (!collectionsMap[selectedDb] || collectionsMap[selectedDb].length === 0) && (
              <div className={`p-3 rounded-md flex items-center ${darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-50 text-yellow-700'}`}>
                <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
                <p className="text-sm">No collections found for this database or indexes are still loading.</p>
              </div>
            )}
            
            {selectedDb && collectionsMap[selectedDb] && collectionsMap[selectedDb].length > 0 && (
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-neutral-700'}`}>Select Collection</label>
                <select
                  value={selectedCollection}
                  onChange={handleCollectionChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 shadow-sm ${darkMode ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500' : 'border-neutral-300 focus:ring-primary-500'}`}
                >
                  <option value="">Select a collection</option>
                  {collectionsMap[selectedDb].map(collection => (
                    <option key={collection.name} value={collection.name}>
                      {collection.name} ({collection.metadata?.file_count || 0} files, {collection.metadata?.total_vectors || 0} vectors)
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!selectedDb || !selectedCollection}
                className={`px-4 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-primary-600 hover:bg-primary-700'} text-white rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 flex items-center ${darkMode ? 'focus:ring-blue-500' : 'focus:ring-primary-500'} disabled:opacity-50`}
              >
                <Plus size={16} className="mr-1.5" /> Add
              </button>
            </div>
          </div>
        </>
      )}
      
      <div className={`flex items-center mt-4 p-3 rounded-md ${darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
        <Info size={16} className="mr-2 flex-shrink-0" />
        <p className="text-xs">Connected databases will be available for knowledge retrieval during conversations with this agent.</p>
      </div>
    </div>
  );
};

export default RagConfigurationTab; 