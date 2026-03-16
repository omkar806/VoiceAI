"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { NextPage } from "next";
import Link from "next/link";
import {
 Plus,
 Database,
 Edit,
 Trash2,
 X,
 RefreshCcw,
 Search,
 FileText,
 Settings,
 Upload,
 Image,
 Check,
 Filter,
 Grid,
 List,
 Download,
 Clock,
 CheckCircle,
 AlertCircle,
 Loader,
 Cpu,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import ragService, {
 VectorDB,
 FileUpload,
 EmbeddingModel,
 Collection,
} from "../../services/rag";
import { toast } from "react-hot-toast";
import { useTheme } from "../../contexts/ThemeContext";
import ConfirmDialog from "../../components/workflows/ConfirmDialog";

// Enhanced animation styles with GPU acceleration
const animationStyles = `
 @keyframes fadeInUp {
   from {
     opacity: 0;
     transform: translate3d(0, 20px, 0);
   }
   to {
     opacity: 1;
     transform: translate3d(0, 0, 0);
   }
 }
 .animate-fadeInUp {
   animation: fadeInUp 0.3s ease-out forwards;
 }

 @keyframes slideInRight {
   from {
     opacity: 0;
     transform: translate3d(30px, 0, 0);
   }
   to {
     opacity: 1;
     transform: translate3d(0, 0, 0);
   }
 }
 .animate-slideInRight {
   animation: slideInRight 0.4s ease-out forwards;
 }

 @keyframes scaleIn {
   from {
     opacity: 0;
     transform: scale3d(0.9, 0.9, 1);
   }
   to {
     opacity: 1;
     transform: scale3d(1, 1, 1);
   }
 }
 .animate-scaleIn {
   animation: scaleIn 0.2s ease-out forwards;
   }

 @keyframes shimmer {
   0% {
     background-position: -200px 0;
   }
   100% {
     background-position: calc(200px + 100%) 0;
   }
 }
 .animate-shimmer {
   background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
   background-size: 200px 100%;
   animation: shimmer 1.5s infinite;
 }

 .gpu-accelerated {
   transform: translate3d(0, 0, 0);
   backface-visibility: hidden;
   perspective: 1000px;
 }

 .content-fade-in {
   animation: fadeInUp 0.4s ease-out forwards;
 }

 .hover-lift {
   transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
 }
 .hover-lift:hover {
   transform: translateY(-2px);
   box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
 }

 .glass-effect {
   backdrop-filter: blur(10px);
   -webkit-backdrop-filter: blur(10px);
   }
`;

// Fast loading skeleton components
const DocumentSkeleton = React.memo(() => {
  const { darkMode } = useTheme();
  return (
    <div className={`p-6 rounded-xl border animate-shimmer ${
      darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/80 border-gray-200/50'
    }`}>
      <div className="flex items-center space-x-4">
        <div className={`w-10 h-10 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className="flex-1 space-y-2">
          <div className={`h-4 rounded w-3/4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          <div className={`h-3 rounded w-1/2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        </div>
        <div className={`w-20 h-6 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
      </div>
    </div>
  );
});

// Enhanced header component
const RAGHeader = React.memo(({ setShowUploadModal }: { setShowUploadModal: (show: boolean) => void }) => {
  const { darkMode } = useTheme();
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 content-fade-in">
      <div className="mb-6 lg:mb-0">
        <div className="flex items-center space-x-3 mb-2">
          <div className={`p-3 rounded-xl ${
            darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'
          }`}>
            <Database size={24} />
          </div>
          <h1 className={`text-3xl font-bold ${
            darkMode ? "text-white" : "text-gray-900"
          }`}>
            RAG Knowledge Base
          </h1>
        </div>
        <p className={`text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
          Manage your knowledge bases for retrieval augmented generation
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/settings?tab=rag">
          <button className={`px-6 py-3 border-2 rounded-xl font-medium transition-all duration-200 group hover-lift ${
            darkMode
              ? "border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500"
              : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
          } shadow-sm hover:shadow-md gpu-accelerated`}>
            <div className="flex items-center space-x-2">
              <Settings size={18} className="transition-transform group-hover:rotate-90" />
              <span>RAG Settings</span>
            </div>
          </button>
        </Link>
        <button
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105 gpu-accelerated"
          onClick={() => setShowUploadModal(true)}
        >
          <div className="flex items-center space-x-2">
            <Upload size={18} />
            <span>Upload File</span>
          </div>
        </button>
      </div>
    </div>
  );
});

// Enhanced search and filter component
const SearchAndFilter = React.memo(({ 
  searchTerm, 
  setSearchTerm, 
  selectedVectorDB, 
  vectorDBs, 
  handleVectorDBChange, 
  handleSearch,
  darkMode 
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedVectorDB: VectorDB | null;
  vectorDBs: VectorDB[];
  handleVectorDBChange: (dbId: string) => void;
  handleSearch: () => void;
  darkMode: boolean;
}) => {
  return (
    <div className={`rounded-2xl border shadow-xl backdrop-blur-sm p-6 mb-8 content-fade-in glass-effect ${
      darkMode
        ? "bg-gray-800/50 border-gray-700/50"
        : "bg-white/80 border-gray-200/50"
    }`}>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={20} className={darkMode ? "text-gray-400" : "text-gray-500"} />
          </div>
          <input
            type="text"
            placeholder="Search your knowledge base..."
            className={`pl-12 pr-4 py-4 w-full rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
              darkMode
                ? "bg-gray-900/50 text-white placeholder-gray-400"
                : "bg-gray-50/50 text-gray-900 placeholder-gray-500"
            }`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className="relative min-w-[250px]">
          <select
            className={`w-full px-4 py-4 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 appearance-none cursor-pointer ${
              darkMode
                ? "bg-gray-900/50 text-white"
                : "bg-gray-50/50 text-gray-900"
            }`}
            value={selectedVectorDB?.id || ""}
            onChange={(e) => handleVectorDBChange(e.target.value)}
          >
            <option value="" disabled>
              Select a vector database
            </option>
            {vectorDBs.map((db) => (
              <option key={db.id} value={db.id}>
                {db.name}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className={`h-5 w-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
});

// Define provider type
type EmbeddingProviderKey =
 | "openai"
 | "cohere"
 | "huggingface"
 | "azure_ai"
 | "googleai";


// Embedding provider options
const embeddingProviders = [
 { value: "openai" as EmbeddingProviderKey, label: "OpenAI" },
 { value: "cohere" as EmbeddingProviderKey, label: "Cohere" },
 { value: "huggingface" as EmbeddingProviderKey, label: "Hugging Face" },
 { value: "azure_ai" as EmbeddingProviderKey, label: "Azure AI" },
];


// Define embedding models with proper typing
const embeddingModels: Record<
 EmbeddingProviderKey,
 Array<{ value: string; label: string }>
> = {
 openai: [
   { value: "text-embedding-3-small", label: "text-embedding-3-small" },
   { value: "text-embedding-3-large", label: "text-embedding-3-large" },
   { value: "text-embedding-ada-002", label: "text-embedding-ada-002" },
 ],
 cohere: [
   { value: "embed-english-v3.0", label: "embed-english-v3.0" },
   { value: "embed-multilingual-v3.0", label: "embed-multilingual-v3.0" },
 ],
 googleai: [{ value: "embedding-001", label: "embedding-001" }],
 huggingface: [
   {
     value: "sentence-transformers/all-mpnet-base-v2",
     label: "all-mpnet-base-v2",
   },
   {
     value: "sentence-transformers/all-MiniLM-L6-v2",
     label: "all-MiniLM-L6-v2",
   },
 ],
 azure_ai: [
   { value: "text-embedding-ada-002", label: "text-embedding-ada-002" },
 ],
};


const RAGPage: NextPage = () => {
 const { darkMode } = useTheme();
 const [documents, setDocuments] = useState<FileUpload[]>([]);
 const [vectorDBs, setVectorDBs] = useState<VectorDB[]>([]);
 const [selectedVectorDB, setSelectedVectorDB] = useState<VectorDB | null>(
   null
 );
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [searchTerm, setSearchTerm] = useState("");
 const [showUploadModal, setShowUploadModal] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [dragOver, setDragOver] = useState(false);


 // Clean up state variables (remove duplicates)
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [dbToDelete, setDbToDelete] = useState<string | null>(null);
 const [fileToUpload, setFileToUpload] = useState<File | null>(null);
 const [uploadDescription, setUploadDescription] = useState("");
 const [uploadEmbeddingProvider, setUploadEmbeddingProvider] =
   useState<EmbeddingProviderKey>("openai");
 const [uploadEmbeddingModel, setUploadEmbeddingModel] = useState(
   "text-embedding-3-small"
 );
 const [uploadIndexName, setUploadIndexName] = useState("");
 const [uploading, setUploading] = useState(false);
 const [filename, setFilename] = useState("");
 const [dragActive, setDragActive] = useState(false);


 // State for upload modal
 const [selectedFile, setSelectedFile] = useState<File | null>(null);
 const [uploadVectorDB, setUploadVectorDB] = useState("");
 const [uploadChunkSize, setUploadChunkSize] = useState(1000);
 const [uploadChunkOverlap, setUploadChunkOverlap] = useState(0);
 const [isUploading, setIsUploading] = useState(false);
 // Add state for tracking uploads in progress
 const [uploadsInProgress, setUploadsInProgress] = useState<
   Map<string, NodeJS.Timeout>
 >(new Map());
 const [documentToDelete, setDocumentToDelete] = useState<FileUpload | null>(null);


 // Add new state for collections and index selection
 const [collections, setCollections] = useState<Collection[]>([]);
 const [indexSelection, setIndexSelection] = useState<'new' | 'existing'>('new');
 const [selectedIndex, setSelectedIndex] = useState<string>('');
 const [isLoadingCollections, setIsLoadingCollections] = useState<boolean>(false);


 // Fetch vector databases
 const fetchVectorDBs = async () => {
   setLoading(true);
   try {
     const data = await ragService.getVectorDBs();
     setVectorDBs(data);
     if (data.length > 0 && !selectedVectorDB) {
       setSelectedVectorDB(data[0]);
       fetchDocumentsForDB(data[0].id);
     } else {
       setLoading(false);
     }
   } catch (err) {
     console.error("Error fetching vector DBs:", err);
     toast.error("Failed to load vector databases");
   }
 };


 // Fetch documents for a specific vector database
 const fetchDocumentsForDB = async (dbId: string) => {
   setLoading(true);
   setError(null);
   try {
     const data = await ragService.getFilesByVectorDB(dbId);
     setDocuments(data);
     // Check for any in-progress uploads
     data.forEach((doc) => {
       if (doc.status === "pending" || doc.status === "processing") {
         startPollingFileStatus(doc.id);
       }
     });
   } catch (err) {
     console.error("Error fetching documents:", err);
     setError("Failed to fetch documents");
   } finally {
     setLoading(false);
   }
 };


 // Poll for file upload status with increased frequency
 const startPollingFileStatus = (fileId: string) => {
   // First clear any existing polling for this file
   if (uploadsInProgress.has(fileId)) {
     clearTimeout(uploadsInProgress.get(fileId));
   }

   // Set up new polling
   const interval = setTimeout(async () => {
     try {
       const status = await ragService.getFileUploadStatus(fileId);
       // Update the document with the new status
       setDocuments((prevDocs) =>
         prevDocs.map((doc) =>
           doc.id === fileId
             ? {
                 ...doc,
                 status: status.status,
                 vector_count: status.vector_count || 0,
                 error_message: status.error_message || null,
               }
             : doc
         )
       );

       // If still processing, continue polling
       if (status.status === "pending" || status.status === "processing") {
         startPollingFileStatus(fileId);
       } else {
         // Remove from in-progress tracking
         const newUploadsInProgress = new Map(uploadsInProgress);
         newUploadsInProgress.delete(fileId);
         setUploadsInProgress(newUploadsInProgress);
       }
     } catch (err) {
       console.error(`Error checking status for file ${fileId}:`, err);
       // Remove from in-progress tracking on error
       const newUploadsInProgress = new Map(uploadsInProgress);
       newUploadsInProgress.delete(fileId);
       setUploadsInProgress(newUploadsInProgress);
     }
   }, 2000); // Poll every 2 seconds

   // Track this polling interval
   setUploadsInProgress((prev) => {
     const newMap = new Map(prev);
     newMap.set(fileId, interval);
     return newMap;
   });
};


 // Clean up intervals when component unmounts
 useEffect(() => {
   return () => {
     uploadsInProgress.forEach((interval) => clearTimeout(interval));
   };
 }, [uploadsInProgress]);


 // Check for updating status of in-progress files when the component mounts
 useEffect(() => {
   const checkInProgressFiles = () => {
     if (documents.length > 0) {
       documents.forEach((doc) => {
         if (doc.status === "processing" || doc.status === "pending") {
           if (!uploadsInProgress.has(doc.id)) {
             startPollingFileStatus(doc.id);
           }
         }
       });
     }
   };


   checkInProgressFiles();
   // Refresh polling when documents change
 }, [documents]);


 useEffect(() => {
   fetchVectorDBs();
 }, []);


 // Update embedding model options when provider changes
 useEffect(() => {
   if (embeddingModels[uploadEmbeddingProvider]?.length > 0) {
     setUploadEmbeddingModel(
       embeddingModels[uploadEmbeddingProvider][0].value
     );
   }
 }, [uploadEmbeddingProvider]);


 // Handle file selection
 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
   if (e.target.files && e.target.files.length > 0) {
     setFileToUpload(e.target.files[0]);


     // Set the filename field
     const fileName = e.target.files[0].name;
     setFilename(fileName);


     // Auto-fill index name from filename without extension
     const indexName =
       fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
     setUploadIndexName(indexName.toLowerCase().replace(/[^a-z0-9]/g, "_"));
   }
 };


 // Handle file drop
 const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
   e.preventDefault();
   setDragOver(false);


   if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
     setFileToUpload(e.dataTransfer.files[0]);


     // Set the filename field
     const fileName = e.dataTransfer.files[0].name;
     setFilename(fileName);


     // Auto-fill index name from filename without extension
     const indexName =
       fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
     setUploadIndexName(indexName.toLowerCase().replace(/[^a-z0-9]/g, "_"));
   }
 };


 // Handle file upload
 const handleUpload = async (e: React.FormEvent) => {
   e.preventDefault();

   if (!fileToUpload || !selectedVectorDB) {
     toast.error("Please select a file and vector database");
     return;
   }

   // Validate index name
   if (indexSelection === 'existing' && !selectedIndex) {
     toast.error("Please select an existing index or create a new one");
     return;
   }
   
   if (indexSelection === 'new' && !uploadIndexName.trim()) {
     toast.error("Please provide a name for the new index");
     return;
   }
   
   // Validate description
   if (!uploadDescription.trim()) {
     toast.error("Please provide a description for the file");
     return;
   }

   setUploading(true);
   try {
     // Convert the embedding provider and model to the expected format for the API
     const embeddingModelFormat = uploadEmbeddingProvider as EmbeddingModel;
     const selectedModel = uploadEmbeddingModel;

     // If creating a new index, ensure it exists first
     if (indexSelection === 'new' && uploadIndexName) {
       try {
         await ragService.createCollection(selectedVectorDB.id, uploadIndexName);
       } catch (error) {
         console.log("Index may already exist or error occurred:", error);
         // Continue anyway - the backend will handle existing indexes
       }
     }

     // Close the modal immediately, before the actual upload is complete
     setShowUploadModal(false);
     
     // Determine the final index name to use
     const finalIndexName = indexSelection === 'existing' ? selectedIndex : uploadIndexName;
     
     // Process the actual upload
     const response = await ragService.uploadFile(
       selectedVectorDB.id,
       fileToUpload,
       uploadDescription, // Pass description directly without null fallback
       embeddingModelFormat,
       finalIndexName, // Use the determined index name
       selectedModel
     );
     
     // Show success message for upload initiation
     toast.success("File upload in progress");
     
     // Fetch fresh documents from the API
     await fetchDocumentsForDB(selectedVectorDB.id);
     
     // Start polling for this file's status
     startPollingFileStatus(response.id);
     
     // Reset the form
     resetUploadForm();
   } catch (err) {
     console.error("Error uploading file:", err);
     toast.error("Failed to upload file. Please try again.");
     setShowUploadModal(false);
   } finally {
     setUploading(false);
   }
 };


 // Reset upload form
 const resetUploadForm = () => {
   setFileToUpload(null);
   setFilename("");
   setUploadDescription("");
   setUploadEmbeddingProvider("openai");
   setUploadEmbeddingModel("text-embedding-3-small");
   setUploadIndexName("");
   setIndexSelection('new');
   setSelectedIndex('');
   setCollections([]);
   if (fileInputRef.current) {
     fileInputRef.current.value = "";
   }
 };


 // Handle search
 const handleSearch = () => {
   if (!selectedVectorDB) return;


   // Filter documents based on search term
   fetchDocumentsForDB(selectedVectorDB.id);
   // The backend filtering would be implemented here in a real implementation
 };


 const filteredDocuments = searchTerm
   ? documents.filter(
       (doc) =>
         doc.original_filename
           .toLowerCase()
           .includes(searchTerm.toLowerCase()) ||
         (doc.description &&
           doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
     )
   : documents;


 // Function to handle embedding provider change
 const handleEmbeddingProviderChange = (provider: EmbeddingProviderKey) => {
   setUploadEmbeddingProvider(provider);
   // Set the first model of the selected provider as the default
   if (embeddingModels[provider] && embeddingModels[provider].length > 0) {
     setUploadEmbeddingModel(embeddingModels[provider][0].value);
   }
 };


 // Render the status badge with an enhanced processing indicator
 const renderStatusBadge = (status: string) => {
   const getStatusConfig = (status: string) => {
     switch (status.toLowerCase()) {
     case "completed":
         return {
           icon: CheckCircle,
           text: "Completed",
           className: darkMode
             ? "bg-green-900/30 text-green-400 border-green-800/50"
             : "bg-green-50 text-green-700 border-green-200"
         };
     case "processing":
         return {
           icon: Loader,
           text: "Processing",
           className: darkMode
             ? "bg-blue-900/30 text-blue-400 border-blue-800/50"
             : "bg-blue-50 text-blue-700 border-blue-200"
         };
     case "failed":
         return {
           icon: AlertCircle,
           text: "Failed",
           className: darkMode
             ? "bg-red-900/30 text-red-400 border-red-800/50"
             : "bg-red-50 text-red-700 border-red-200"
         };
       case "pending":
         return {
           icon: Clock,
           text: "Pending",
           className: darkMode
             ? "bg-yellow-900/30 text-yellow-400 border-yellow-800/50"
             : "bg-yellow-50 text-yellow-700 border-yellow-200"
         };
     default:
         return {
           icon: Clock,
           text: status,
           className: darkMode
             ? "bg-gray-700/50 text-gray-400 border-gray-600/50"
             : "bg-gray-100 text-gray-600 border-gray-200"
         };
     }
   };

   const config = getStatusConfig(status);
   const IconComponent = config.icon;

       return (
     <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${config.className}`}>
       <IconComponent size={14} className={`mr-1.5 ${status.toLowerCase() === 'processing' ? 'animate-spin' : ''}`} />
       {config.text}
     </div>
       );
 };


 // Handle delete confirmation
 const handleDeleteConfirm = async () => {
   if (!documentToDelete) return;

   try {
     await ragService.deleteFile(documentToDelete.id);
     if (selectedVectorDB) {
       await fetchDocumentsForDB(selectedVectorDB.id);
     }
     toast.success("File deleted successfully");
   } catch (err) {
     console.error("Error deleting file:", err);
     toast.error("Failed to delete file");
   } finally {
     setDocumentToDelete(null);
   }
 };


 // Add function to fetch collections
 const fetchCollections = async (dbId: string) => {
   if (!dbId) return;
   
   setIsLoadingCollections(true);
   try {
     const collections = await ragService.listCollections(dbId);
     setCollections(collections);
     setIsLoadingCollections(false);
   } catch (err) {
     console.error("Error fetching collections:", err);
     toast.error("Failed to load collections");
     setIsLoadingCollections(false);
   }
 };


 // Update the Vector DB selection handler to fetch collections
 const handleVectorDBChange = (dbId: string) => {
   const db = vectorDBs.find((db) => db.id === dbId);
   if (db) {
     setSelectedVectorDB(db);
     fetchCollections(dbId);
   }
 };


 // Add a function to fetch the latest description for an index
 const fetchIndexDescription = async (indexName: string) => {
   if (!selectedVectorDB || !indexName) return "";
   
   try {
     // Get all files for the current vector DB
     const files = await ragService.getFilesByVectorDB(selectedVectorDB.id);
     
     // Find files associated with this index, sorted by creation date (newest first)
     const matchingFiles = files
       .filter(file => file.index_name === indexName)
       .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
     
     // Use the description from the most recent file
     if (matchingFiles.length > 0) {
       return matchingFiles[0].description || "";
     }
     
     return "";
   } catch (err) {
     console.error("Error fetching index description:", err);
     return "";
   }
 };


 // Update the collection selection code to fetch and set the description
 const handleIndexChange = async (indexName: string) => {
   setSelectedIndex(indexName);
   setUploadIndexName(indexName);
   
   // Fetch and set the description for the selected index
   const description = await fetchIndexDescription(indexName);
   if (description) {
     setUploadDescription(description);
   }
 };


 return (
   <MainLayout>
     <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
     <div
       className={`max-w-7xl mx-auto p-6 ${
         darkMode ? "bg-gray-900 text-white" : ""
       }`}
     >
       <RAGHeader setShowUploadModal={setShowUploadModal} />
       <SearchAndFilter
         searchTerm={searchTerm}
         setSearchTerm={setSearchTerm}
         selectedVectorDB={selectedVectorDB}
         vectorDBs={vectorDBs}
         handleVectorDBChange={handleVectorDBChange}
         handleSearch={handleSearch}
         darkMode={darkMode}
       />


       {loading ? (
         <div className={`rounded-2xl border shadow-xl p-8 content-fade-in glass-effect ${
           darkMode
             ? "bg-gray-800/50 border-gray-700/50"
             : "bg-white/80 border-gray-200/50"
         }`}>
           <div className="text-center py-12">
             <div className="relative mx-auto w-16 h-16 flex items-center justify-center mb-6">
               <div className={`absolute w-16 h-16 border-2 rounded-full ${
                 darkMode ? "border-gray-700" : "border-gray-200"
               }`}></div>
               <div className={`w-14 h-14 border-2 border-t-transparent rounded-full animate-spin ${
                 darkMode ? "border-blue-400" : "border-blue-600"
               }`}></div>
             </div>
             <h3 className={`text-lg font-semibold mb-2 ${
               darkMode ? "text-white" : "text-gray-900"
             }`}>
               Loading Knowledge Base
             </h3>
             <p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>
               Fetching your documents...
           </p>
         </div>
           
           {/* Loading skeleton */}
           <div className="space-y-4 mt-8">
             {[...Array(3)].map((_, i) => (
               <DocumentSkeleton key={i} />
             ))}
         </div>
       </div>
       ) : error ? (
         <div className={`rounded-2xl border shadow-xl p-8 text-center content-fade-in glass-effect ${
           darkMode
             ? "bg-gray-800/50 border-gray-700/50"
             : "bg-white/80 border-gray-200/50"
         }`}>
           <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 ${
             darkMode ? "bg-red-900/30" : "bg-red-100"
           }`}>
             <AlertCircle size={32} className={darkMode ? "text-red-400" : "text-red-600"} />
           </div>
           <h3 className={`text-xl font-semibold mb-2 ${
             darkMode ? "text-white" : "text-gray-900"
           }`}>
             Something went wrong
         </h3>
           <p className={`mb-6 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
             {error}
           </p>
           <button
             className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105 gpu-accelerated"
             onClick={() => selectedVectorDB && fetchDocumentsForDB(selectedVectorDB.id)}
           >
             <div className="flex items-center space-x-2">
               <RefreshCcw size={18} />
               <span>Try Again</span>
             </div>
           </button>
         </div>
       ) : filteredDocuments.length > 0 ? (
         <div className={`rounded-2xl border shadow-xl backdrop-blur-sm content-fade-in glass-effect ${
           darkMode
             ? "bg-gray-800/50 border-gray-700/50"
             : "bg-white/80 border-gray-200/50"
         }`}>
           {/* Enhanced header with stats */}
           <div className={`p-6 border-b ${
             darkMode ? "border-gray-700/50" : "border-gray-200/50"
           }`}>
             <div className="flex items-center justify-between">
               <div>
                 <h2 className={`text-xl font-semibold ${
                   darkMode ? "text-white" : "text-gray-900"
                 }`}>
                   Knowledge Base Documents
                 </h2>
                 <p className={`text-sm mt-1 ${
                   darkMode ? "text-gray-400" : "text-gray-600"
                 }`}>
                   {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
                 </p>
               </div>
               <div className="flex items-center space-x-2">
                 <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                   darkMode
                     ? "bg-blue-900/30 text-blue-400" 
                     : "bg-blue-50 text-blue-700"
                 }`}>
                   {selectedVectorDB?.name || 'Database'}
             </div>
           </div>
         </div>
       </div>

           {/* Enhanced document grid */}
           <div className="p-6">
             <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
               {filteredDocuments.map((doc, index) => (
         <div
                   key={doc.id}
                   className={`p-6 rounded-xl border transition-all duration-200 hover-lift gpu-accelerated animate-slideInRight ${
             darkMode
                       ? "bg-gray-900/50 border-gray-700/50 hover:border-gray-600"
                       : "bg-white/80 border-gray-200/50 hover:border-gray-300"
           }`}
                   style={{ animationDelay: `${index * 0.1}s` }}
                 >
                   {/* Document header */}
                   <div className="flex items-start justify-between mb-4">
                     <div className="flex items-center space-x-3 flex-1 min-w-0">
                       <div className={`p-2 rounded-lg ${
                         darkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"
                       }`}>
                         <FileText size={20} />
           </div>
                       <div className="flex-1 min-w-0">
                         <h3 className={`font-semibold truncate ${
                           darkMode ? "text-white" : "text-gray-900"
                         }`}>
                           {doc.original_filename}
                         </h3>
                         <p className={`text-sm truncate ${
                           darkMode ? "text-gray-400" : "text-gray-600"
                         }`}>
                           {doc.description || "No description"}
           </p>
         </div>
           </div>
         </div>

                   {/* Status badge */}
                   <div className="mb-4">
                       {renderStatusBadge(doc.status)}
                   </div>

                   {/* Action buttons */}
                   <div className="flex justify-end">
                         <button
                       className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                             darkMode
                           ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                           : "bg-red-50 text-red-700 hover:bg-red-100"
                           }`}
                           onClick={() => setDocumentToDelete(doc)}
                         >
                       <div className="flex items-center space-x-2">
                         <Trash2 size={16} />
                         <span>Delete</span>
                       </div>
                         </button>
                       </div>
                 </div>
                 ))}
             </div>
           </div>
         </div>
       ) : (
         <div className={`rounded-2xl border shadow-xl p-12 text-center content-fade-in glass-effect ${
             darkMode
             ? "bg-gray-800/50 border-gray-700/50"
             : "bg-white/80 border-gray-200/50"
         }`}>
           <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
             darkMode ? "bg-gray-700/50" : "bg-gray-100"
           }`}>
             <Database size={40} className={darkMode ? "text-gray-400" : "text-gray-500"} />
           </div>
           <h3 className={`text-2xl font-semibold mb-3 ${
             darkMode ? "text-white" : "text-gray-900"
           }`}>
             No documents found
           </h3>
           <p className={`text-lg mb-8 max-w-md mx-auto ${
             darkMode ? "text-gray-400" : "text-gray-600"
           }`}>
             Get started by uploading your first document to the knowledge base.
           </p>
           <button
             onClick={() => setShowUploadModal(true)}
             className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105 gpu-accelerated"
           >
             <div className="flex items-center space-x-3">
               <Plus size={20} />
               <span>Upload Your First Document</span>
             </div>
           </button>
         </div>
       )}


       {/* Enhanced File Upload Modal */}
       {showUploadModal && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-scaleIn">
           <div className={`rounded-2xl w-full max-w-2xl shadow-2xl glass-effect border ${
             darkMode 
               ? "bg-gray-800/90 border-gray-700/50" 
               : "bg-white/90 border-gray-200/50"
           }`}>
             {/* Enhanced header */}
             <div className={`flex justify-between items-center p-6 border-b ${
               darkMode ? "border-gray-700/50" : "border-gray-200/50"
             }`}>
               <div className="flex items-center space-x-3">
                 <div className={`p-2 rounded-xl ${
                   darkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"
                 }`}>
                   <Upload size={20} />
                 </div>
                 <div>
                   <h3 className={`text-xl font-semibold ${
                     darkMode ? "text-white" : "text-gray-900"
                   }`}>
                 Upload Knowledge Base File
               </h3>
                   <p className={`text-sm ${
                     darkMode ? "text-gray-400" : "text-gray-600"
                   }`}>
                     Add documents to enhance your AI's knowledge
                   </p>
                 </div>
               </div>
               <button
                 className={`p-2 rounded-xl transition-all duration-200 hover-lift ${
                   darkMode
                     ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700/50"
                     : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                 }`}
                 onClick={() => {
                   setShowUploadModal(false);
                   resetUploadForm();
                 }}
               >
                 <X size={20} />
               </button>
             </div>

             <form onSubmit={handleUpload} className="p-6 space-y-6">
               {/* Vector Database Selection */}
               <div>
                 <label className={`block text-sm font-semibold mb-3 flex items-center ${
                   darkMode ? "text-gray-200" : "text-gray-800"
                 }`}>
                   <Database size={16} className="mr-2" />
                   Vector Database 
                   <span className="text-red-500 ml-1">*</span>
                 </label>
                 <select
                   className={`w-full px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
                     darkMode
                       ? "bg-gray-900/50 text-white"
                       : "bg-gray-50/50 text-gray-900"
                   }`}
                   value={selectedVectorDB?.id || ""}
                   onChange={(e) => handleVectorDBChange(e.target.value)}
                   required
                 >
                   <option value="" disabled>
                     Select a vector database
                   </option>
                   {vectorDBs.map((db) => (
                     <option key={db.id} value={db.id}>
                       {db.name}
                     </option>
                   ))}
                 </select>
               </div>

               {/* Enhanced File Upload Area */}
               <div>
                 <label className={`block text-sm font-semibold mb-3 flex items-center ${
                   darkMode ? "text-gray-200" : "text-gray-800"
                 }`}>
                   <FileText size={16} className="mr-2" />
                   File Upload 
                   <span className="text-red-500 ml-1">*</span>
                 </label>
                 <div
                   className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 hover-lift ${
                     dragOver
                       ? darkMode
                         ? "border-blue-500 bg-blue-900/20"
                         : "border-blue-500 bg-blue-50"
                       : darkMode
                         ? "border-gray-600 hover:border-blue-500 hover:bg-gray-700/30"
                         : "border-gray-300 hover:border-blue-500 hover:bg-blue-50/50"
                   }`}
                   onDragOver={(e) => {
                     e.preventDefault();
                     setDragOver(true);
                   }}
                   onDragLeave={() => setDragOver(false)}
                   onDrop={handleDrop}
                   onClick={() => fileInputRef.current?.click()}
                 >
                   <input
                     type="file"
                     name="file"
                     ref={fileInputRef}
                     onChange={handleFileChange}
                     className="hidden"
                     required
                     accept=".pdf,.txt,.docx,.csv"
                   />
                   <div className="flex flex-col items-center">
                     <div className={`p-4 rounded-full mb-4 ${
                       dragOver
                         ? darkMode
                           ? "bg-blue-900/30 text-blue-400"
                           : "bg-blue-100 text-blue-600"
                         : darkMode
                           ? "bg-gray-700/50 text-gray-400"
                           : "bg-gray-100 text-gray-500"
                     }`}>
                       <Upload size={32} />
                     </div>
                     <div className={`text-lg font-semibold mb-2 ${
                       darkMode ? "text-white" : "text-gray-900"
                     }`}>
                       {dragOver ? "Drop your file here" : "Choose a file or drag & drop"}
                     </div>
                     <div className={`text-sm mb-3 ${
                       darkMode ? "text-gray-400" : "text-gray-600"
                     }`}>
                       Supported formats: PDF, TXT, DOCX, CSV
                     </div>
                     <div className={`text-xs px-3 py-1 rounded-full ${
                       darkMode ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"
                     }`}>
                       Maximum file size: 10MB
                   </div>
                 </div>
                 </div>
                 
                 {/* File preview */}
                 {fileToUpload && (
                   <div className={`mt-4 p-4 rounded-xl border ${
                     darkMode 
                       ? "bg-green-900/20 border-green-800/50 text-green-400" 
                       : "bg-green-50 border-green-200 text-green-700"
                   }`}>
                     <div className="flex items-center space-x-3">
                       <div className={`p-2 rounded-lg ${
                         darkMode ? "bg-green-800/30" : "bg-green-100"
                       }`}>
                         <FileText size={16} />
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="font-medium truncate">{fileToUpload.name}</p>
                         <p className="text-sm opacity-75">
                           {Math.round(fileToUpload.size / 1024)} KB
                         </p>
                       </div>
                       <CheckCircle size={20} />
                   </div>
                 </div>
                 )}
               </div>

               {/* Enhanced form fields */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className={`block text-sm font-semibold mb-3 flex items-center ${
                     darkMode ? "text-gray-200" : "text-gray-800"
                   }`}>
                     <Edit size={16} className="mr-2" />
                     Description 
                     <span className="text-red-500 ml-1">*</span>
                   </label>
                   <input
                     type="text"
                     className={`w-full px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
                       darkMode
                         ? "bg-gray-900/50 text-white placeholder-gray-400"
                         : "bg-gray-50/50 text-gray-900 placeholder-gray-500"
                     }`}
                     value={uploadDescription}
                     onChange={(e) => setUploadDescription(e.target.value)}
                     placeholder="Brief description of contents"
                     required
                   />
                 </div>
               </div>

               {/* Index Selection */}
               <div>
                 <label className={`block text-sm font-semibold mb-3 flex items-center ${
                   darkMode ? "text-gray-200" : "text-gray-800"
                 }`}>
                   <Database size={16} className="mr-2" />
                   Index Selection 
                   <span className="text-red-500 ml-1">*</span>
                   </label>
                 
                 {/* Radio buttons for index selection */}
                 <div className="flex space-x-6 mb-4">
                   <label className={`flex items-center cursor-pointer ${
                     darkMode ? "text-gray-300" : "text-gray-700"
                   }`}>
                         <input
                           type="radio"
                           name="indexSelection"
                           value="new"
                           checked={indexSelection === 'new'}
                           onChange={() => setIndexSelection('new')}
                       className="mr-2 text-blue-600 focus:ring-blue-500"
                         />
                     <span className="font-medium">Create New Index</span>
                       </label>
                   <label className={`flex items-center cursor-pointer ${
                     darkMode ? "text-gray-300" : "text-gray-700"
                   }`}>
                         <input
                           type="radio"
                           name="indexSelection"
                           value="existing"
                           checked={indexSelection === 'existing'}
                           onChange={() => {
                             setIndexSelection('existing');
                             if (selectedVectorDB && collections.length === 0) {
                               fetchCollections(selectedVectorDB.id);
                             }
                           }}
                       className="mr-2 text-blue-600 focus:ring-blue-500"
                           disabled={!selectedVectorDB}
                         />
                     <span className="font-medium">Use Existing Index</span>
                       </label>
                     </div>
                     
                 {/* Index input/selection */}
                     {indexSelection === 'new' ? (
                   <div>
                   <input
                     type="text"
                       className={`w-full px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
                       darkMode
                           ? "bg-gray-900/50 text-white placeholder-gray-400"
                           : "bg-gray-50/50 text-gray-900 placeholder-gray-500"
                     }`}
                     value={uploadIndexName}
                     onChange={(e) => setUploadIndexName(e.target.value)}
                     placeholder="e.g., company_handbook"
                     required
                   />
                     <p className={`text-xs mt-2 ${
                       darkMode ? "text-gray-400" : "text-gray-500"
                     }`}>
                       Index name will be automatically formatted (lowercase, underscores)
                     </p>
                   </div>
                     ) : (
                       <div>
                         {isLoadingCollections ? (
                       <div className={`animate-pulse h-12 rounded-xl ${
                         darkMode ? 'bg-gray-700' : 'bg-gray-200'
                       }`}></div>
                         ) : collections.length > 0 ? (
                           <select
                         className={`w-full px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
                               darkMode
                             ? "bg-gray-900/50 text-white"
                             : "bg-gray-50/50 text-gray-900"
                             }`}
                             value={selectedIndex}
                             onChange={(e) => {
                               handleIndexChange(e.target.value);
                             }}
                             required
                           >
                             <option value="" disabled>Select an existing index</option>
                             {collections.map((collection) => (
                               <option key={collection.name} value={collection.name}>
                                 {collection.name}
                               </option>
                             ))}
                           </select>
                         ) : (
                       <div className={`text-sm p-4 border-2 border-dashed rounded-xl text-center ${
                         darkMode 
                           ? 'bg-gray-800/50 border-gray-600 text-gray-300' 
                           : 'bg-gray-50 border-gray-300 text-gray-600'
                       }`}>
                         <Database size={24} className={`mx-auto mb-2 ${
                           darkMode ? 'text-gray-500' : 'text-gray-400'
                         }`} />
                         <p className="font-medium mb-1">No existing indexes found</p>
                         <p className="text-xs">
                           {selectedVectorDB ? (
                             <button 
                               type="button"
                               onClick={() => fetchCollections(selectedVectorDB.id)}
                               className="text-blue-600 hover:text-blue-700 underline"
                             >
                               Refresh to check again
                             </button>
                           ) : (
                             "Select a vector database first"
                           )}
                         </p>
                 </div>
                         )}
                       </div>
                     )}
                 </div>
                 
               {/* Embedding configuration */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className={`block text-sm font-semibold mb-3 flex items-center ${
                     darkMode ? "text-gray-200" : "text-gray-800"
                   }`}>
                     <Cpu size={16} className="mr-2" />
                     Embedding Provider
                   </label>
                   <select
                     className={`w-full px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
                       darkMode
                         ? "bg-gray-900/50 text-white"
                         : "bg-gray-50/50 text-gray-900"
                     }`}
                     value={uploadEmbeddingProvider}
                     onChange={(e) => handleEmbeddingProviderChange(e.target.value as EmbeddingProviderKey)}
                     required
                   >
                     {embeddingProviders.map((provider) => (
                       <option key={provider.value} value={provider.value}>
                         {provider.label}
                       </option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className={`block text-sm font-semibold mb-3 flex items-center ${
                     darkMode ? "text-gray-200" : "text-gray-800"
                   }`}>
                     <Settings size={16} className="mr-2" />
                     Embedding Model
                   </label>
                   <select
                     className={`w-full px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 ${
                       darkMode
                         ? "bg-gray-900/50 text-white"
                         : "bg-gray-50/50 text-gray-900"
                     }`}
                     value={uploadEmbeddingModel}
                     onChange={(e) => setUploadEmbeddingModel(e.target.value)}
                     required
                   >
                     {uploadEmbeddingProvider && embeddingModels[uploadEmbeddingProvider] ? (
                       embeddingModels[uploadEmbeddingProvider].map((model) => (
                           <option key={model.value} value={model.value}>
                             {model.label}
                           </option>
                       ))
                     ) : (
                       <option value="">Select a provider first</option>
                     )}
                   </select>
                 </div>
               </div>

               {/* Enhanced action buttons */}
               <div className={`border-t pt-6 mt-8 flex justify-end space-x-4 ${
                 darkMode ? "border-gray-700/50" : "border-gray-200/50"
               }`}>
                 <button
                   type="button"
                   className={`px-6 py-3 border-2 rounded-xl font-medium transition-all duration-200 hover-lift ${
                     darkMode
                       ? "border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500"
                       : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                   } shadow-sm hover:shadow-md gpu-accelerated`}
                   onClick={() => {
                     setShowUploadModal(false);
                     resetUploadForm();
                   }}
                   disabled={uploading}
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 gpu-accelerated ${
                     uploading || !fileToUpload
                       ? darkMode
                         ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                         : "bg-gray-300 text-gray-500 cursor-not-allowed"
                       : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                   }`}
                   disabled={uploading || !fileToUpload}
                 >
                   {uploading ? (
                     <div className="flex items-center space-x-3">
                       <div className="relative w-5 h-5">
                         <div className="absolute w-5 h-5 border-2 border-white/30 rounded-full"></div>
                         <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                       </div>
                       <span>Uploading Document...</span>
                     </div>
                   ) : (
                     <div className="flex items-center space-x-2">
                       <Upload size={18} />
                       <span>Upload Document</span>
                     </div>
                   )}
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}


       {/* Enhanced Confirm Dialog */}
       <ConfirmDialog
         isOpen={!!documentToDelete}
         title="Delete Document"
         message={`Are you sure you want to delete "${documentToDelete?.original_filename}"? This action cannot be undone.`}
         onConfirm={handleDeleteConfirm}
         onCancel={() => setDocumentToDelete(null)}
         darkMode={darkMode}
       />
     </div>
   </MainLayout>
 );
};


export default RAGPage;


