from datetime import datetime
from enum import Enum
from typing import Any, List, Optional, Union

from pydantic import BaseModel as PydanticBaseModel
from pydantic import ConfigDict


class ExtendedEnum(Enum):

    @classmethod
    def list(cls):
        return list(map(lambda c: c.value, cls))


class BaseModel(PydanticBaseModel):
    """Base model for all data models"""

    model_config = ConfigDict(
        populate_by_name=True,
        # validate_assignment=True,
        from_attributes=True,
        arbitrary_types_allowed=True,
        protected_namespaces=(),
    )


class LoggerConfiguration(BaseModel):
    """Represents the logger configuration"""

    log_level: str


class ServerConfiguration(BaseModel):
    """Represents the server configuration"""

    host: str
    port: str
    num_workers: int
    reload: bool


class OpenAIConfiguration(BaseModel):
    """Represents the OpenAI configuration"""

    api_key: str
    model_name: str
    embedding_model_name: str


class AzureAIConfiguration(BaseModel):
    """Represents the AzureAI configuration"""

    api_key: str
    type: str
    base: str
    version: str
    deployment_name: str
    embedding_deployment_name: str
    model_name: str


class PerplexityAIConfiguration(BaseModel):
    """Represents the Perplexity configuration"""

    api_key: str
    model_name: str
    api_base: str


class AnthropicAIConfiguration(BaseModel):
    """Represents the Anthropic configuration"""

    api_key: str
    model_name: str


class GeminiAIConfiguration(BaseModel):
    """Represents the Anthropic configuration"""

    api_key: str
    model_name: str


class APIHandlerConfiguration(BaseModel):
    """Represents the APIHandler configuration"""

    api_config_file: str
    openapi_spec_dir: str


class MongoDBConfiguration(BaseModel):
    """Represents the MongoDB configuration"""

    host: str
    port: int
    username: str
    password: str
    db: str


class PostgreSQLConfiguration(BaseModel):
    """Represents the PostgreSQL configuration"""

    host: str
    port: int
    username: str
    password: str
    db: str
    app_schema: str

class SQLServerConfiguration(BaseModel):
    """Represents the SQLServer configuration"""

    host: str
    port: int
    username: str
    password: str
    db: str
    app_schema: str


class SQLiteConfiguration(BaseModel):
    """Represents the SQLite configuration"""

    db_path: str


class OpenSearchConfiguration(BaseModel):
    """Represents the OpenSearch configuration"""

    host: str
    username: str
    password: str
    use_ssl: bool
    verify_certs: bool
    index_name: str


class LLMResponseFormatConfiguration(BaseModel):
    planner_schema: str
    api_generator_schema: str


class LangfuseConfiguration(BaseModel):
    """Represents the Langfuse configuration"""

    env: str


class CommonConfiguration(BaseModel):
    max_retries: int
    x_api_key: str


class PocketBaseConfiguration(BaseModel):
    """Represents the PocketBase configuration"""

    url: str
    admin_email: str
    admin_password: str


# class AWSConfiguration(BaseModel):
#     """Represents the AWS configuration"""

#     aws_access_key_id: str
#     aws_secret_access_key: str


class PineconeConfiguation(BaseModel):
    """Represents the Pinecone configuration"""

    api_key: str
    index: str
    namespace: str
    spec_cloud: str
    spec_region: str
    metric: str
    timeout: int


class AzureAISearchConfiguration(BaseModel):
    """Represents the AzureAISearch configuration"""

    endpoint: str
    key: str
    index_name: str


class GoogleServicesConfiguration(BaseModel):
    """Represents the Google services configuration"""

    serp_api_key: str


class ServiceBusConfiguration(BaseModel):
    """Represents the Service Bus configuration"""

    connection_string: str
    queue_name: str
    num_processes: int
    num_tasks_per_process: int


class RedisConfiguration(BaseModel):
    """Represents the Redis configuration"""

    host: str
    port: int
    password: Optional[str] = None
    db: int = 0


class AzureDeepResearchConfiguration(BaseModel):
    """Represents the Azure Deep Research configuration"""

    project_endpoint: str
    bing_resource_name: str
    deep_research_model_deployment_name: str
    model_deployment_name: str
    azure_tenant_id: str
    azure_client_id: str
    azure_client_secret: str


class Configuration(BaseModel):
    """Represents the configuration"""

    application_name: str
    logger_configuration: LoggerConfiguration
    # aws_configuration: AWSConfiguration
    # openai_configuration: OpenAIConfiguration
    server_configuration: ServerConfiguration

    # azureai_configuration: AzureAIConfiguration
    # bedrock_configuration: BedrockConfiguration
    # perplexityai_configuration: PerplexityAIConfiguration
    # anthropicai_configuration: AnthropicAIConfiguration
    # geminiai_configuration: GeminiAIConfiguration

    # VectorDBConfiguration: VectorDBConfiguration
    # common_configuration: CommonConfiguration
    # transformer_configuration: TranformerConfiguration
    # mongodb_configuration: MongoDBConfiguration
    postgresql_configuration: PostgreSQLConfiguration
    # sqlserver_configuration: SQLServerConfiguration
    # sqlite_configuration: SQLiteConfiguration
    # opensearch_configuration: OpenSearchConfiguration

    # pinecone_configuration: PineconeConfiguation
    # llm_response_format_configuration: LLMResponseFormatConfiguration

    # langfuse_configuration: LangfuseConfiguration
    # pocketbase_configuration: PocketBaseConfiguration

    # google_services_configuration: GoogleServicesConfiguration

    # service_bus_configuration: ServiceBusConfiguration
    # redis_configuration: RedisConfiguration
    # azureai_search_configuration: AzureAISearchConfiguration
    # azure_deep_research_configuration: AzureDeepResearchConfiguration
    api_v1_str: str
    project_name: str
    encryption_key: str
    access_token_expire_minutes: int
    secret_key: str
    jwt_algorithm: str
    jwt_secret_key: str
    environment: str


class QueryContext(BaseModel):
    """Represents the query context"""

    query: str
    role: str
    stream_response: Any


# region Constants
class LangfuseMetaData(BaseModel):
    generation_name: str
    generation_id: str
    parent_observation_id: str
    version: str
    trace_user_id: str
    session_id: str
    tags: list[str]
    trace_name: str
    trace_id: str
    trace_metadata: dict[str, Any]
    trace_version: str
    trace_release: str
    existing_trace_id: Optional[str] = None
    update_trace_keys: Optional[list[str]] = None
    debug_langfuse: Optional[bool] = None


class LLMProvider(ExtendedEnum):
    "Represents provider"

    openai: str = "openai"
    bedrock: str = "bedrock"
    azure_openai: str = "azure_openai"
    perplexity_ai: str = "perplexity_ai"
    anthropic_ai: str = "anthropic_ai"
    gemini_ai: str = "gemini_ai"
    lite_llm: str = "lite_llm"
    azure_deep_research: str = "azure_deep_research"


class BedrockModelMapping(ExtendedEnum):
    """Represents model name to model ID mapping"""

    Jamba_Instruct: str = "ai21.jamba-instruct-v1:0"
    Jurassic_2_Mid: str = "ai21.j2-mid-v1"
    Jurassic_2_Ultra: str = "ai21.j2-ultra-v1"
    Titan_Text_G1_Express: str = "amazon.titan-text-express-v1"
    Titan_Text_G1_Lite: str = "amazon.titan-text-lite-v1"
    Titan_Text_Premier: str = "amazon.titan-text-premier-v1:0"
    Titan_Embeddings_G1_Text: str = "amazon.titan-embed-text-v1"
    Titan_Embedding_Text_v2: str = "amazon.titan-embed-text-v2:0"
    Titan_Multimodal_Embeddings_G1: str = "amazon.titan-embed-image-v1"
    Titan_Image_Generator_G1_V1: str = "amazon.titan-image-generator-v1"
    Titan_Image_Generator_G1_V2: str = "amazon.titan-image-generator-v2:0"
    Claude_2_0: str = "anthropic.claude-v2"
    Claude_2_1: str = "anthropic.claude-v2:1"
    Claude_3_Sonnet: str = "anthropic.claude-3-sonnet-20240229-v1:0"
    Claude_3_5_Sonnet: str = "anthropic.claude-3-sonnet-20240229-v1:0"
    Claude_3_Haiku: str = "anthropic.claude-3-haiku-20240307-v1:0"
    Claude_3_Opus: str = "anthropic.claude-3-opus-20240229-v1:0"
    Claude_Instant: str = "anthropic.claude-instant-v1"
    Command_14: str = "cohere.command-text-v14"
    Command_Light_15: str = "cohere.command-light-text-v14"
    Command_R: str = "cohere.command-r-v1:0"
    Command_R_Plus: str = "cohere.command-r-plus-v1:0"
    Embed_English_3: str = "cohere.embed-english-v3"
    Embed_Multilingual_3: str = "cohere.embed-multilingual-v3"
    Llama_2_Chat_13B: str = "meta.llama2-13b-chat-v1"
    Llama_2_Chat_70B: str = "meta.llama2-70b-chat-v1"
    Llama_3_8B_Instruct: str = "meta.llama3-8b-instruct-v1:0"
    Llama_3_70B_Instruct: str = "meta.llama3-70b-instruct-v1:0"
    Llama_3_1_8B_Instruct: str = "meta.llama3-1-8b-instruct-v1:0"
    Llama_3_1_70B_Instruct: str = "meta.llama3-1-70b-instruct-v1:0"
    Llama_3_1_405B_Instruct: str = "meta.llama3-1-405b-instruct-v1:0"
    Mistral_7B_Instruct: str = "mistral.mistral-7b-instruct-v0:2"
    Mixtral_8X7B_Instruct: str = "mistral.mixtral-8x7b-instruct-v0:1"
    Mistral_Large: str = "mistral.mistral-large-2402-v1:0"
    Mistral_Large_2_2407: str = "mistral.mistral-large-2407-v1:0"
    Mistral_Small: str = "mistral.mistral-small-2402-v1:0"
    Stable_Diffusion_XL_0: str = "stability.stable-diffusion-xl-v0"
    Stable_Diffusion_XL_1: str = "stability.stable-diffusion-xl-v1"
    Stable_Diffusion_3_Large: str = "stability.sd3-large-v1:0"
    Stable_Image_Ultra: str = "stability.stable-image-ultra-v1:0"
    Stability_Image_Core: str = "stability.stable-image-core-v1:0"


class LangfusePrompt(ExtendedEnum):
    "Represents llm prompts"

    search_eval: str = "search_eval"
    search_eval_compare: str = "search_eval_compare"
    global_search: str = "global_search"
    generator: str = "generator"
    sql_agent: str = "sql_agent"
    mongo_agent: str = "mongo_agent"
    novelty_summary: str = "novelty_summary"


class DatabaseType(ExtendedEnum):
    "Represents different database types"

    postgresql: str = "postgresql"
    pinecone: str = "pinecone"
    azure_ai_search: str = "azure_ai_search"
    chroma: str = "chroma"


class VectorDBModel(ExtendedEnum):
    pinecone: str = "pinecone"
    azure_ai_search: str = "azure_ai_search"


class PatentClassification(BaseModel):
    code: str | None = None
    description: str | None = None


class Patent(BaseModel):
    publication_number: str | None = None
    pdf: str | None = None
    patent_link: str | None = None
    title: str | None = None
    claim_text: str | None = None
    claims_list: list[str] | None = None
    independent_claim: str | None = None
    abstract: str | None = None
    priority_date: str | None = None
    embedding: list[float] | None = None
    cosine_similarity: float | None = None
    description: str | None = None
    patent_citations: dict[str, Any] | None = None
    non_patent_citations: list[dict[str, Any]] | None = None
    assignees: list[str] | None = None
    assignee: str | None = None
    publication_date: str | None = None
    expiration_date: str | None = None
    remaining_life: str | None = None
    classifications: list[PatentClassification] | None = None
    limitations: list[str] | None = None
    similar_documents: list[dict[str, Any]] | None = None


class NonPatent(BaseModel):
    """Represents a non-patent document"""

    title: str | None = None
    paper_link: str | None = None
    publication_date: str | None = None
    url: str | None = None
    content: str | None = None
    embedding: list[float] | None = None
    cosine_similarity: float | None = None
    abstract: str | None = None
    authors: list[str] | None = None
    assignee: str | None = None
    summary: str | None = None
    id: str | None = None


class TaskStatus(str, Enum):
    IN_QUEUE = "IN_QUEUE"
    RELATED_PATENTS = "RELATED_PATENTS"
    RANKING_PATENTS = "RANKING_PATENTS"
    EVALUATING_PATENTS = "EVALUATING_PATENTS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    IN_PROGRESS = "IN_PROGRESS"
    # Non-Obviousness
    CHECK_EXISTING_TASK_RESULT = "CHECK_EXISTING_TASK_RESULT"
    EXTRACT_PRIOR_ART_BATCHES = "EXTRACT_PRIOR_ART_BATCHES"
    HYBRID_SEARCH_FOR_PRIOR_ART = "HYBRID_SEARCH_FOR_PRIOR_ART"
    CREATE_LIMTATION_CANDIDATE_MATRIX = "CREATE_LIMTATION_CANDIDATE_MATRIX"
    FINDING_BEST_COMBINATION = "FINDING_BEST_COMBINATION"
    TSM_EVALUATION = "TSM_EVALUATION"
    # Patent Eligibility
    CLASSIFYING_CLAIM = "CLASSIFYING_CLAIM"
    DETECTING_INVENTIVE_CONCEPT = "DETECTING_INVENTIVE_CONCEPT"
    STATUTORY_CATEGORIES_CHECK = "STATUTORY_CATEGORIES_CHECK"


class TaskType(str, Enum):
    INVALIDATION = "INVALIDATION"
    INFRINGEMENT = "INFRINGEMENT"
    NON_OBVIOUSNESS = "NON_OBVIOUSNESS"
    PATENT_ELIGIBLE_SUBJECT_MATTER = "PATENT_ELIGIBLE_SUBJECT_MATTER"


class AnalysisModule(str, Enum):
    NOVELTY = "NOVELTY"
    NON_OBVIOUSNESS = "NON_OBVIOUSNESS"
    DEFINITENESS = "DEFINITENESS"
    PATENT_ELIGIBLE_SUBJECT_MATTER = "PATENT_ELIGIBLE_SUBJECT_MATTER"


class ProjectStatus(str, Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class DataSource(str, Enum):
    """Represents different data sources"""

    serp = "serp"
    arxiv = "arxiv"
    perplexity = "perplexity"
    o3_deep_research = "o3_deep_research"
    # ieee = "ieee"
    # other = "other"


class DataSourceType(str, Enum):
    """Represents different data sources"""

    PL = "PL"
    NPL = "NPL"
    OTHER = "OTHER"


class DataSourceInterface(BaseModel):
    """Represents a data source interface"""

    name: DataSource
    type: DataSourceType
    active: bool
    description: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class RelatedPatentsBySource(BaseModel):
    """Represents related patents"""

    source: DataSource | None = None
    source_type: DataSourceType | None = None
    patents: List[Patent | NonPatent] | None = None
    search_queries: str | None = None


class Project(BaseModel):
    """Project model for multiple patent analyses"""

    project_id: str
    name: str
    description: str
    patent_ids: List[str]
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
    error: str | None = None


class Task(BaseModel):
    task_id: str
    patent_id: str
    status: TaskStatus
    task_type: TaskType
    module: AnalysisModule | None = None
    created_at: datetime
    updated_at: datetime
    project_id: str | None = None
    current_agent: str | None = None
    result: Union[dict, list[Any], None] = None
    feedback_result: Union[dict, list[Any], None] = None
    error: str | None = None


class NonObviousnessTask(BaseModel):
    """Represents a non-obviousness task"""

    id: str
    task_id: str
    patent_id: str
    status: TaskStatus
    task_type: TaskType
    module: AnalysisModule | None = None
    created_at: datetime
    updated_at: datetime
    project_id: str | None = None
    current_agent: str | None = None
    result: Union[dict, list[Any], None] = None
    error: str | None = None


class AzureAISearchRAGSearchType(ExtendedEnum):
    "Represents the search types for RAG search"
    simple: str = "simple"
    full: str = "full"
    semantic: str = "semantic"
    semantic_hybrid: str = "semantic_hybrid"
    simple_hybrid: str = "simple_hybrid"
    full_hybrid: str = "full_hybrid"
    hybrid: str = "hybrid"


class AzureAISearchDocument(BaseModel):
    """Represents a document in Azure AI Search"""

    id: str | None = None
    content: str | None = None
    metadata: dict[str, Any]
    content_vector: list[float] | None = None