from enum import Enum
# RAG Vector DB Types Enum
class VectorDBTypeEnum(str, Enum):
    PINECONE = "pinecone"
    CHROMA = "chroma"
    OPENSEARCH = "opensearch"


# RAG Embedding Model Enum
class EmbeddingModelEnum(str, Enum):
    OPENAI = "openai"
    COHERE = "cohere"
    HF = "huggingface"
    AZURE = "azure_openai"
