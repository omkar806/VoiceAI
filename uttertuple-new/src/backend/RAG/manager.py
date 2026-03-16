"""RAG Manager module for vector database operations"""
import csv
import uuid
from pathlib import Path
from typing import Any, Dict, List
import chromadb
import docx
import openai
import PyPDF2
from openai import AzureOpenAI
from opensearchpy import OpenSearch, RequestsHttpConnection
from pinecone import Pinecone, ServerlessSpec
from schemas.rag_schema import (
    EmbeddingModel,
    RAGVectorDBCollectionResponse,
    VectorDBType,
)
import logging
logger = logging.getLogger(__name__)
from RAG.db_service import RAGVectorDBModelService, RAGFileUploadModelService
class VectorDBProvider:
    """Base class for vector database providers"""

    def __init__(self, config: Dict[str, Any]) -> None:
        self.config = config
        self.client = None

    def connect(self) -> bool:
        """Connect to the vector database"""
        raise NotImplementedError("Subclasses must implement connect()")

    def list_collections(self) -> List[RAGVectorDBCollectionResponse]:
        """List all collections/indexes in the vector database"""
        raise NotImplementedError("Subclasses must implement list_collections()")

    def create_collection(self, name: str, dimension: int = 1536) -> bool:
        """Create a new collection/index in the vector database"""
        raise NotImplementedError("Subclasses must implement create_collection()")

    def delete_collection(self, name: str) -> bool:
        """Delete a collection/index from the vector database"""
        raise NotImplementedError("Subclasses must implement delete_collection()")

    def upsert_vectors(self, collection_name: str, embeddings: List[List[float]], texts: List[str], metadata: List[Dict[str, Any]]) -> int:
        """Upsert vectors into a collection/index"""
        raise NotImplementedError("Subclasses must implement upsert_vectors()")

    def query(self, collection_name: str, query_embedding: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """Query a collection/index"""
        raise NotImplementedError("Subclasses must implement query()")


class PineconeProvider(VectorDBProvider):
    """Pinecone vector database provider"""

    def connect(self) -> bool:
        """Connect to Pinecone"""
        try:
            # Initialize Pinecone
            self.client = Pinecone(
                api_key=self.config["api_key"],
            )

            # Test the connection by trying to list indexes
            # This will raise an exception if the API key is invalid
            _ = self.list_collections()
            logger.info(f"Pinecone connected")

            return True
        except Exception as e:
            logger.error(f"Failed to connect to Pinecone: {str(e)}")
            self.client = None  # Reset client on failure
            raise Exception(f"Failed to connect to Pinecone: {str(e)}")

    def list_collections(self) -> List[RAGVectorDBCollectionResponse]:
        """List all indexes in Pinecone"""
        try:
            if not self.client:
                if not self.connect():
                    return []

            indexes = self.client.list_indexes()
            # logger.info(f"Indexes: {indexes}")
            return [RAGVectorDBCollectionResponse(name=index.name, vector_count=None, dimension=None, metadata={}) for index in indexes]  # Need to connect to each index to get count
        except Exception as e:
            logger.error(f"Failed to list Pinecone indexes: {str(e)}")
            return []

    def create_collection(self, name: str, dimension: int = 1536) -> bool:
        """Create a new index in Pinecone"""
        try:
            if not self.client:
                if not self.connect():
                    return False

            # Check if index already exists
            existing_indexes = self.client.list_indexes()
            existing_index_names = [index.name for index in existing_indexes]
            if name in existing_index_names:
                return True

            # Create index
            self.client.create_index(name=name, dimension=dimension, metric="cosine",spec=ServerlessSpec(cloud="aws", region="us-east-1"))

            return True
        except Exception as e:
            logger.error(f"Failed to create Pinecone index: {str(e)}")
            raise Exception(f"Failed to create Pinecone index: {str(e)}")
    def delete_collection(self, name: str) -> bool:
        """Delete an index from Pinecone"""
        try:
            if not self.client:
                if not self.connect():
                    return False

            # Check if index exists
            existing_indexes = self.client.list_indexes()
            if name not in existing_indexes:
                return False

            # Delete index
            self.client.delete_index(name)

            return True
        except Exception as e:
            logger.error(f"Failed to delete Pinecone index: {str(e)}")
            return False

    def upsert_vectors(self, collection_name: str, embeddings: List[List[float]], texts: List[str], metadata: List[Dict[str, Any]]) -> int:
        """Upsert vectors into a Pinecone index"""
        try:
            if not self.client:
                if not self.connect():
                    return 0

            # Check if index exists
            existing_indexes = self.client.list_indexes()
            logger.info(f"Existing Indexes: {existing_indexes}")
            if collection_name not in existing_indexes:
                self.create_collection(collection_name, len(embeddings[0]))

            # Connect to index
            logger.info(f"Index: {collection_name}")
            index = self.client.Index(collection_name)
            logger.info(f"metadata: {metadata}")
            # Prepare vectors
            vectors = []
            for i, (embedding, text, meta) in enumerate(zip(embeddings, texts, metadata)):
                # Add text to metadata
                meta["text"] = text

                vectors.append({"id": f"vec_{i}_{uuid.uuid4()}", "values": embedding, "metadata": meta})

            # Upsert vectors
            index.upsert(vectors=vectors)

            return len(vectors)
        except Exception as e:
            logger.error(f"Failed to upsert vectors to Pinecone: {str(e)}")
            raise Exception(f"Failed to upsert vectors to Pinecone: {str(e)}")

    def query(self, collection_name: str, query_embedding: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """Query a Pinecone index"""
        try:
            if not self.client:
                if not self.connect():
                    return 0
            logger.info(f"Querying Pinecone index: {collection_name}")
            # Check if index exists
            existing_indexes = self.client.list_indexes()
            existing_index_names = [index.name for index in existing_indexes]
            if collection_name== "dialogue":
                collection_name = "dialogtuple"
            logger.info(f"Existing Indexes: {existing_index_names} and collection name: {collection_name}")
            if collection_name not in existing_index_names:
                return []

            # Connect to index
            index = self.client.Index(collection_name)

            # Query
            logger.info(f"Querying Pinecone index: {collection_name}")
            results = index.query(vector=query_embedding, top_k=top_k, include_metadata=True)
            logger.info(f"Results: {str(results)[:100]}")
            # Format results
            formatted_results = []
            for match in results.matches:
                formatted_results.append({"id": match.id, "score": match.score, "text": match.metadata.get("text", ""), "metadata": match.metadata})

            return formatted_results
        except Exception as e:
            logger.error(f"Failed to query Pinecone: {str(e)}")
            return []


class ChromaProvider(VectorDBProvider):
    """ChromaDB vector database provider"""

    def connect(self) -> bool:
        """Connect to ChromaDB"""
        try:
            # Initialize ChromaDB client
            self.client = chromadb.HttpClient(host=self.config["host"], port=self.config["port"], ssl=self.config.get("ssl", False), headers=self.config.get("headers", {}))
            self.list_collections()

            return True
        except Exception as e:
            logger.error(f"Failed to connect to ChromaDB: {str(e)}")
            raise Exception(f"Failed to connect to ChromaDB: {str(e)}")

    def list_collections(self) -> List[RAGVectorDBCollectionResponse]:
        """List all collections in ChromaDB"""
        try:
            if not self.client:
                if not self.connect():
                    return []

            collections = self.client.list_collections()
            logger.info(f"Collections: {collections}")
            return [RAGVectorDBCollectionResponse(name=collection, vector_count=None, metadata={}) for collection in collections]
        except Exception as e:
            logger.error(f"Failed to list ChromaDB collections: {str(e)}")
            raise Exception(f"Failed to list ChromaDB collections: {str(e)}")

    def create_collection(self, name: str, dimension: int = 1536) -> bool:
        """Create a new collection in ChromaDB"""
        try:
            if not self.client:
                if not self.connect():
                    return False

            # Check if collection already exists
            existing_collections = [c.name for c in self.client.list_collections()]
            if name in existing_collections:
                return True

            # Create collection
            self.client.create_collection(name=name)

            return True
        except Exception as e:
            logger.error(f"Failed to create ChromaDB collection: {str(e)}")
            return False

    def delete_collection(self, name: str) -> bool:
        """Delete a collection from ChromaDB"""
        try:
            if not self.client:
                if not self.connect():
                    return False

            # Delete collection
            self.client.delete_collection(name=name)

            return True
        except Exception as e:
            logger.error(f"Failed to delete ChromaDB collection: {str(e)}")
            return False

    def upsert_vectors(self, collection_name: str, embeddings: List[List[float]], texts: List[str], metadata: List[Dict[str, Any]]) -> int:
        """Upsert vectors into a ChromaDB collection"""
        try:
            if not self.client:
                if not self.connect():
                    return 0

            # Get or create collection
            try:
                collection = self.client.get_collection(name=collection_name)
            except:
                collection = self.client.create_collection(name=collection_name)

            # Generate IDs
            ids = [f"vec_{i}_{uuid.uuid4()}" for i in range(len(embeddings))]

            # Upsert vectors
            collection.upsert(embeddings=embeddings, documents=texts, metadatas=metadata, ids=ids)

            return len(embeddings)
        except Exception as e:
            logger.error(f"Failed to upsert vectors to ChromaDB: {str(e)}")
            return 0

    def query(self, collection_name: str, query_embedding: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """Query a ChromaDB collection"""
        try:
            if not self.client:
                if not self.connect():
                    return []

            # Get collection
            try:
                collection = self.client.get_collection(name=collection_name)
            except:
                return []

            # Query
            results = collection.query(query_embeddings=[query_embedding], n_results=top_k)

            # Format results
            formatted_results = []
            for i, (id, document, metadata, distance) in enumerate(zip(results.get("ids", [[]])[0], results.get("documents", [[]])[0], results.get("metadatas", [[]])[0], results.get("distances", [[]])[0])):
                formatted_results.append({"id": id, "score": 1.0 - distance, "text": document, "metadata": metadata})  # Convert distance to similarity score

            return formatted_results
        except Exception as e:
            logger.error(f"Failed to query ChromaDB: {str(e)}")
            return []


class OpenSearchProvider(VectorDBProvider):
    """OpenSearch vector database provider"""

    def connect(self) -> bool:
        """Connect to OpenSearch"""
        try:
            # Initialize OpenSearch client
            self.client = OpenSearch(hosts=[self.config["host"]], http_auth=(self.config["username"], self.config["password"]), use_ssl=self.config.get("use_ssl", True), verify_certs=False, connection_class=RequestsHttpConnection)
            _ = self.list_collections()

            return True
        except Exception as e:
            logger.error(f"Failed to connect to OpenSearch: {str(e)}")
            self.client = None  # Reset client on failure
            raise Exception(f"Failed to connect to OpenSearch: {str(e)}")

    def list_collections(self) -> List[RAGVectorDBCollectionResponse]:
        """List all indexes in OpenSearch"""
        try:
            if not self.client:
                if not self.connect():
                    return []

            try:
                indices = self.client.indices.get_alias()
                # logger.info(f"Indices: {indices}")
                return [RAGVectorDBCollectionResponse(name=index_name, metadata=index_info) for index_name, index_info in indices.items()]
            except Exception as e:
                logger.error(f"Could not get indices due to {e}")
                raise Exception(f"Could not get indices due to {e}")
        except Exception as e:
            logger.error(f"Failed to list OpenSearch indexes: {str(e)}")
            raise Exception(f"Failed to list OpenSearch indexes: {str(e)}")

    def create_collection(self, name: str, dimension: int = 1536) -> bool:
        """Create a new index in OpenSearch"""
        try:
            if not self.client:
                if not self.connect():
                    return False
            # Define the index mapping
            index_mapping = {
                "settings": {"index": {"knn": True, "knn.algo_param.ef_search": 128}},  # Enable k-NN vector search,
                "mappings": {
                    "properties": {
                        "id": {"type": "keyword", "index": True},
                        "metadata": {"type": "nested", "properties": {"filename": {"type": "text"}}},
                        "embedding": {
                            "type": "knn_vector",
                            "dimension": dimension,  # Ensure this matches the text-embedding-3-small model
                            "method": {"name": "hnsw", "space_type": "cosinesimil", "engine": "nmslib", "parameters": {"ef_construction": 256, "m": 48}},
                        },
                    }
                },
            }
            # Check if index already exists
            if name not in self.list_collections():
                response = self.client.indices.create(index=name, body=index_mapping)
                logger.info(f"Successfully created index: {name}")
                return response

            return True
        except Exception as e:
            logger.error(f"Failed to create OpenSearch index: {str(e)}")
            return False

    def delete_collection(self, name: str) -> bool:
        """Delete an index from OpenSearch"""
        try:
            if not self.client:
                if not self.connect():
                    return False

            # Check if index exists
            if not self.client.indices.exists(index=name):
                return False

            # Delete index
            self.client.indices.delete(index=name)

            return True
        except Exception as e:
            logger.error(f"Failed to delete OpenSearch index: {str(e)}")
            return False

    def upsert_vectors(self, collection_name: str, embeddings: List[List[float]], texts: List[str], metadata: List[Dict[str, Any]]) -> int:
        """Upsert vectors into an OpenSearch index"""
        try:
            if not self.client:
                if not self.connect():
                    return 0

            # Create index if it doesn't exist
            if not self.client.indices.exists(index=collection_name):
                self.create_collection(collection_name, len(embeddings[0]))

            # Prepare bulk operation
            bulk_data = []
            for i, (embedding, text, meta) in enumerate(zip(embeddings, texts, metadata)):
                # Generate document ID
                doc_id = f"vec_{i}_{uuid.uuid4()}"

                # Index operation
                bulk_data.append({"index": {"_index": collection_name, "_id": doc_id}})

                # Document data
                bulk_data.append({"vector": embedding, "text": text, "metadata": meta})

            # Execute bulk operation
            if bulk_data:
                self.client.bulk(body=bulk_data)

            return len(embeddings)
        except Exception as e:
            logger.error(f"Failed to upsert vectors to OpenSearch: {str(e)}")
            return 0

    def query(self, collection_name: str, query_embedding: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """Query an OpenSearch index"""
        try:
            if not self.client:
                if not self.connect():
                    return []

            # Check if index exists
            if not self.client.indices.exists(index=collection_name):
                return []

            # Prepare query
            query = {"size": top_k, "query": {"knn": {"vector": {"vector": query_embedding, "k": top_k}}}}

            # Execute query
            response = self.client.search(index=collection_name, body=query)

            # Format results
            formatted_results = []
            for hit in response["hits"]["hits"]:
                formatted_results.append({"id": hit["_id"], "score": hit["_score"], "text": hit["_source"].get("text", ""), "metadata": hit["_source"].get("metadata", {})})

            return formatted_results
        except Exception as e:
            logger.error(f"Failed to query OpenSearch: {str(e)}")
            return []


class EmbeddingProvider:
    """Base class for embedding model providers"""

    def __init__(self, model_name: str, api_key: str = None) -> None:
        self.model_name = model_name
        self.api_key = api_key

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for a list of texts"""
        raise NotImplementedError("Subclasses must implement get_embeddings()")


class OpenAIEmbeddingProvider(EmbeddingProvider):
    """OpenAI embedding model provider"""

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings from OpenAI"""
        try:
            if self.api_key:
                openai.api_key = self.api_key

            # Get embeddings
            embeddings = []
            for text in texts:
                response = openai.embeddings.create(input=text, model=self.model_name or "text-embedding-3-small")
                embeddings.append(response.data[0].embedding)

            return embeddings
        except Exception as e:
            logger.error(f"Failed to get OpenAI embeddings: {str(e)}")
            raise Exception(f"Failed to get OpenAI embeddings: {str(e)}")


class AzureOpenAIEmbeddingProvider(EmbeddingProvider):
    """Azure OpenAI embedding model provider"""

    def __init__(self, model_name: str, api_key: str = None, endpoint: str = None) -> None:
        super().__init__(model_name, api_key)
        self.endpoint = endpoint

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings from Azure OpenAI"""
        try:
            # Initialize client
            client = AzureOpenAI(api_key=self.api_key, azure_endpoint=self.endpoint, api_version="2023-05-15")

            # Get embeddings
            embeddings = []
            for text in texts:
                response = client.embeddings.create(input=text, model=self.model_name)
                embeddings.append(response.data[0].embedding)

            return embeddings
        except Exception as e:
            logger.error(f"Failed to get Azure OpenAI embeddings: {str(e)}")
            raise Exception(f"Failed to get Azure OpenAI embeddings: {str(e)}")


class RAGManager:
    """Manager for RAG operations"""

    def __init__(self,rag_vector_db_service: RAGVectorDBModelService,rag_file_upload_service: RAGFileUploadModelService) -> None:
        self.rag_vector_db_service = rag_vector_db_service
        self.rag_file_upload_service = rag_file_upload_service

    def get_vector_db_provider(self, db_type: VectorDBType, config: Dict[str, Any]) -> VectorDBProvider:
        """Get a vector database provider"""
        if db_type == VectorDBType.PINECONE:
            return PineconeProvider(config)
        elif db_type == VectorDBType.CHROMA:
            return ChromaProvider(config)
        elif db_type == VectorDBType.OPENSEARCH:
            return OpenSearchProvider(config)
        else:
            raise ValueError(f"Unsupported vector database type: {db_type}")

    def get_embedding_provider(self, embedding_provider: EmbeddingModel, embedding_model: str, api_key: str = None, endpoint: str = None) -> EmbeddingProvider:
        """Get an embedding model provider using the model selection"""
        provider = embedding_provider
        model_name = embedding_model

        if provider == EmbeddingModel.OPENAI:
            return OpenAIEmbeddingProvider(model_name, api_key)
        elif provider == EmbeddingModel.AZURE:
            return AzureOpenAIEmbeddingProvider(model_name, api_key, endpoint)
        else:
            raise ValueError(f"Unsupported embedding model type: {provider}")

    def process_file_upload(
        self,
        user_id: int,
        file_id: int,
        file_path: str,
        file_type: str,
        vector_db_provider: VectorDBProvider,
        collection_name: str,
        embedding_selection: str,
        embedding_provider: EmbeddingModel,
        api_key: str = None,
        endpoint: str = None,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
    ) -> Dict[str, Any]:
        """Process file upload, extract text, create embeddings, and store in vector DB"""
        try:
            logger.info(f"Processing file upload for {file_path}")
            # Extract text from file
            texts = self.extract_text_from_file(file_path, file_type)

            # Chunk texts
            chunked_texts = self.chunk_text(texts, chunk_size, chunk_overlap)

            # Get embedding provider
            embedding_provider = self.get_embedding_provider(embedding_provider, embedding_selection, api_key, endpoint)

            # Get embeddings
            embeddings = embedding_provider.get_embeddings(chunked_texts)
            logger.info(f"Embeddings: {len(embeddings)}")
            # Create metadata
            metadata = []
            for i, text in enumerate(chunked_texts):
                metadata.append({"text": text, "file_id": str(file_id), "user_id": str(user_id), "chunk_id": i, "file_type": file_type, "filename": file_path})

            # Create collection if it doesn't exist
            # Calculate embedding dimension based on first embedding
            dimension = len(embeddings[0]) if embeddings else 1536
            logger.info(f"Collection Name: {collection_name}")
            logger.info(f"Dimension: {dimension}")
            # collection_name = "dialogtuple"
            vector_db_provider.create_collection(collection_name, dimension)

            # Upsert vectors
            vector_count = vector_db_provider.upsert_vectors(collection_name=collection_name, embeddings=embeddings, texts=chunked_texts, metadata=metadata)

            return {"status": "success", "vector_count": vector_count, "message": f"Successfully processed file and created {vector_count} vectors"}
        except Exception as e:
            logger.error(f"Failed to process file upload: {str(e)}")
            raise Exception(f"Failed to process file upload: {str(e)}")

    def extract_text_from_file(self, file_path: str, file_type: str) -> List[str]:
        """Extract text from a file"""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # Extract text based on file type
        if file_type.lower() == "pdf":
            return self._extract_text_from_pdf(file_path)
        elif file_type.lower() in ["doc", "docx"]:
            return self._extract_text_from_docx(file_path)
        elif file_type.lower() == "txt":
            return self._extract_text_from_txt(file_path)
        elif file_type.lower() == "csv":
            return self._extract_text_from_csv(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    def _extract_text_from_pdf(self, file_path: str) -> List[str]:
        """Extract text from a PDF file"""
        try:
            # Open the PDF file
            with open(file_path, "rb") as file:
                # Create a PDF reader object
                reader = PyPDF2.PdfReader(file)

                # Extract text from each page
                texts = []
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        texts.append(text)

            return texts
        except Exception as e:
            logger.error(f"Failed to extract text from PDF: {str(e)}")
            return []

    def _extract_text_from_docx(self, file_path: str) -> List[str]:
        """Extract text from a DOCX file"""
        try:
            # Open the DOCX file
            doc = docx.Document(file_path)

            # Extract text from paragraphs
            texts = [paragraph.text for paragraph in doc.paragraphs if paragraph.text]

            return texts
        except Exception as e:
            logger.error(f"Failed to extract text from DOCX: {str(e)}")
            return []

    def _extract_text_from_txt(self, file_path: str) -> List[str]:
        """Extract text from a TXT file"""
        try:
            # Open the TXT file
            with open(file_path, "r", encoding="utf-8") as file:
                lines = file.readlines()

            # Group lines into paragraphs (empty line as separator)
            texts = []
            current_paragraph = ""

            for line in lines:
                if line.strip():
                    current_paragraph += line
                else:
                    if current_paragraph:
                        texts.append(current_paragraph)
                        current_paragraph = ""

            # Add the last paragraph if any
            if current_paragraph:
                texts.append(current_paragraph)

            return texts
        except Exception as e:
            logger.error(f"Failed to extract text from TXT: {str(e)}")
            return []

    def _extract_text_from_csv(self, file_path: str) -> List[str]:
        """Extract text from a CSV file"""
        try:
            # Open the CSV file
            with open(file_path, "r", encoding="utf-8") as file:
                reader = csv.reader(file)

                # Extract text from rows
                texts = []
                for row in reader:
                    text = " ".join(str(cell) for cell in row if cell)
                    if text:
                        texts.append(text)

            return texts
        except Exception as e:
            logger.error(f"Failed to extract text from CSV: {str(e)}")
            return []

    def chunk_text(self, texts: List[str], chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
        """Chunk texts into smaller pieces"""
        chunked_texts = []

        for text in texts:
            # Skip empty text
            if not text:
                continue

            # If text is shorter than chunk size, keep it as is
            if len(text) <= chunk_size:
                chunked_texts.append(text)
                continue

            # Split text into chunks
            for i in range(0, len(text), chunk_size - chunk_overlap):
                chunk = text[i : i + chunk_size]
                if len(chunk) < 50:  # Skip very small chunks
                    continue
                chunked_texts.append(chunk)

        return chunked_texts