import { UUID } from 'crypto';
// import api from './api';
import api,{ getUserId, setAuthToken, removeAuthToken, setUserId, removeUserId, getOrganizationId } from './apiConfig';


// Type definitions based on the backend schema
export enum VectorDBType {
 PINECONE = "pinecone",
 CHROMA = "chroma",
 OPENSEARCH = "opensearch"
}


export enum EmbeddingModel {
 OPENAI = "openai",
 COHERE = "cohere",
 HF = "huggingface",
 AZURE = "azure_openai"
}


// Base VectorDatabase interface that matches the API response
export interface VectorDatabase {
  id: string;
  name: string;
  db_type: string;
  description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  api_key?: string;
  base_url?: string;
  options?: Record<string, any>;
}

// Legacy interface that includes config field for backward compatibility
// This is kept for compatibility with existing code
export interface VectorDB {
  id: string;
  user_id: string;
 name: string;
 description: string | null;
 db_type: VectorDBType;
 config: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface CreateVectorDBData {
  name: string;
  description?: string | null;
  db_type: VectorDBType;
  config: Record<string, any>;
}


export interface FileUploadBase {
 description: string;
 vector_db_id: string;
 embedding_model: EmbeddingModel;
 index_name: string;
}


export interface FileUpload extends FileUploadBase {
 id: string;
 user_id: string;
 filename: string;
 original_filename: string;
 file_type: string;
 status: string;
 vector_count: number | null;
 error_message: string | null;
 created_at: string;
 updated_at: string;
}


export interface RAGSearchParams {
 query: string;
 top_k?: number;
 vector_db_id: string;
 embedding_model: EmbeddingModel;
 collection_name: string;
}


export interface RAGSearchResult {
 id: string;
 score: number;
 text: string;
 metadata: Record<string, any>;
}


export interface RAGSearchResponse {
 results: RAGSearchResult[];
}


export type FileUploadStatus = {
 id: string;
 status: string;
 vector_count?: number;
 error_message?: string;
};


export interface Document {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  user_id: string;
  vector_db_id: string;
  collection_name: string;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  name: string;
  vector_count?: number;
}

export interface CollectionCreateResponse {
  name: string;
  success: boolean;
  message: string;
}

export interface CollectionMetadata {
  file_count: number;
  total_vectors: number;
  descriptions: string[];
  embedding_models: string[];
  last_updated: string | null;
}

// RAG service
const ragService = {
 /**
  * Get all vector databases
  */
 getVectorDBs: async (): Promise<VectorDB[]> => {
   const response = await api.get<VectorDatabase[]>('/rag/vector-dbs');
   
   // Convert VectorDatabase objects to VectorDB objects for backward compatibility
   return response.data.map(db => ({
     id: db.id,
     user_id: db.user_id,
     name: db.name,
     description: db.description || null,
     db_type: db.db_type as VectorDBType,
     config: db.options || {},
     created_at: db.created_at,
     updated_at: db.updated_at
   }));
 },


 /**
  * Get vector database by ID
  */
 getVectorDBById: async (id: string): Promise<VectorDB> => {
   const response = await api.get<VectorDatabase>(`/rag/vector-dbs/${id}`);
   const db = response.data;
   
   // Convert VectorDatabase to VectorDB for backward compatibility
   return {
     id: db.id,
     user_id: db.user_id,
     name: db.name,
     description: db.description || null,
     db_type: db.db_type as VectorDBType,
     config: db.options || {},
     created_at: db.created_at,
     updated_at: db.updated_at
   };
 },


 /**
  * Create a new vector database
  */
 createVectorDB: async (data: {
   name: string;
   db_type: string;
   description?: string;
   api_key?: string;
   base_url?: string;
   options?: Record<string, any>;
 }): Promise<VectorDB> => {
   // Convert to the format expected by the backend API
   const backendData = {
     name: data.name,
     description: data.description,
     db_type: data.db_type,
     config: data.options || {}
   };
   
   // Add api_key to config if provided
   if (data.api_key) {
     backendData.config.api_key = data.api_key;
   }
   
   // Add base_url to config if provided
   if (data.base_url) {
     backendData.config.base_url = data.base_url;
   }
   
   const response = await api.post<VectorDatabase>('/rag/vector-dbs', backendData);
   const db = response.data;
   
   // Convert VectorDatabase to VectorDB for backward compatibility
   return {
     id: db.id,
     user_id: db.user_id,
     name: db.name,
     description: db.description || null,
     db_type: db.db_type as VectorDBType,
     config: db.options || {},
     created_at: db.created_at,
     updated_at: db.updated_at
   };
 },


 /**
  * Update a vector database
  */
 updateVectorDB: async (
   id: string,
   data: {
     name?: string;
     description?: string;
     api_key?: string;
     base_url?: string;
     options?: Record<string, any>;
   }
 ): Promise<VectorDB> => {
   const response = await api.put<VectorDatabase>(`/rag/vector-dbs/${id}`, data);
   const db = response.data;
   
   // Convert VectorDatabase to VectorDB for backward compatibility
   return {
     id: db.id,
     user_id: db.user_id,
     name: db.name,
     description: db.description || null,
     db_type: db.db_type as VectorDBType,
     config: db.options || {},
     created_at: db.created_at,
     updated_at: db.updated_at
   };
 },


 /**
  * Delete a vector database
  */
 deleteVectorDB: async (id: string): Promise<void> => {
   await api.delete(`/rag/vector-dbs/${id}`);
 },


 /**
  * Get all documents for a vector database collection
  */
 getDocuments: async (vectorDbId: string, collectionName: string): Promise<Document[]> => {
   const response = await api.get<Document[]>(`/rag/vector-dbs/${vectorDbId}/collections/${collectionName}/documents`);
   return response.data;
 },


 /**
  * Upload a document to a vector database collection
  */
 uploadDocument: async (
   vectorDbId: string,
   collectionName: string,
   data: {
     title: string;
     content: string;
     metadata?: Record<string, any>;
     embedding_model?: string;
   }
 ): Promise<Document> => {
   const response = await api.post<Document>(
     `/rag/vector-dbs/${vectorDbId}/collections/${collectionName}/documents`,
     data
   );
   return response.data;
 },


 /**
  * Delete a document
  */
 deleteDocument: async (documentId: string): Promise<void> => {
   await api.delete(`/rag/documents/${documentId}`);
 },


 /**
  * Get files for a vector database
  */
 getFilesByVectorDB: async (vectorDBId: string): Promise<FileUpload[]> => {
   const response = await api.get<FileUpload[]>(`/rag/vector-dbs/${vectorDBId}/files`);
   return response.data;
 },


 /**
  * Get file by ID
  */
 getFileById: async (fileId: string): Promise<FileUpload> => {
   const response = await api.get<FileUpload>(`/rag/files/${fileId}`);
   return response.data;
 },


 /**
  * Upload a file to a vector database
  */
 uploadFile: async (
   vectorDbId: string,
   file: File,
   description: string,
   embeddingProvider: EmbeddingModel,
   indexName: string,
   embeddingModel: string
 ): Promise<FileUpload> => {
   const formData = new FormData();
   formData.append('file', file);
   formData.append('filename', file.name);
     formData.append('description', description);
   formData.append('embedding_provider', embeddingProvider);
   formData.append('embedding_model', embeddingModel);
   formData.append('index_name', indexName);

   try {
     const response = await api.post(`/rag/vector-dbs/${vectorDbId}/files`, formData, {
       headers: {
         'Content-Type': 'multipart/form-data',
       },
     });
     return response.data;
   } catch (error) {
     console.error('Upload error:', error);
     throw error;
   }
 },


 /**
  * Delete a file
  */
 deleteFile: async (fileId: string): Promise<void> => {
   await api.delete(`/rag/files/${fileId}`);
 },


 /**
  * Search vector database
  */
 search: async (params: RAGSearchParams): Promise<RAGSearchResponse> => {
   const response = await api.post<RAGSearchResponse>('/rag/search', params);
   return response.data;
 },


 // Add method to check file upload status
 getFileUploadStatus: async (fileId: string): Promise<FileUploadStatus> => {
   const response = await api.get<FileUploadStatus>(`/rag/files/${fileId}/status`);
   return response.data;
 },

 /**
  * List collections for a vector database
  */
 listCollections: async (vectorDbId: string): Promise<Collection[]> => {
   const response = await api.get<{collections: Collection[]}>(`/rag/vector-dbs/${vectorDbId}/collections`);
   return response.data.collections;
 },

 /**
  * Create a new collection in a vector database
  */
 createCollection: async (vectorDbId: string, name: string, dimension: number = 1536): Promise<CollectionCreateResponse> => {
   const response = await api.post<CollectionCreateResponse>(`/rag/vector-dbs/${vectorDbId}/collections`, {
     name,
     dimension
   });
   return response.data;
 },

 /**
  * Get metadata for a specific collection
  */
 getCollectionMetadata: async (vectorDbId: string, collectionName: string): Promise<CollectionMetadata> => {
   const response = await api.get<CollectionMetadata>(`/rag/vector-dbs/${vectorDbId}/collections/${collectionName}/metadata`);
   return response.data;
 },
};


export default ragService;

