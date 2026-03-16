import json
import logging
from typing import List, Optional, Dict, Any, AsyncGenerator
from uuid import UUID

from sqlalchemy.orm import Session
from openai import OpenAI

from database.db_models import LLMUserData, TTSUserData, RAGVectorDB, RAGFileUpload, Agent
from schemas.agent import AgentCreate, AgentToolCreate, CollectionFieldSchema, RAGDatabaseConfigSchema
from schemas.workflow import WorkflowCreate, WorkflowNodeCreate, WorkflowEdgeCreate, NodeType
from providers.manager import ProviderManager
from agents.manager import AgentManager
from workflow.manager import WorkflowManager
from security.manager import SecurityManager

logger = logging.getLogger(__name__)


# ─── Available Models & Voices per Provider ───────────────────────────────────

LLM_MODELS_BY_PROVIDER = {
    "openai": [
        {"value": "gpt-4o-mini", "label": "GPT-4o Mini (recommended)"},
        {"value": "gpt-4o", "label": "GPT-4o"},
        {"value": "gpt-4.1-nano", "label": "GPT-4.1 Nano"},
        {"value": "gpt-4.1-mini", "label": "GPT-4.1 Mini"},
        {"value": "gpt-4.1", "label": "GPT-4.1"},
        {"value": "chatgpt-4o-latest", "label": "ChatGPT-4o Latest"},
        {"value": "o3", "label": "o3"},
        {"value": "o3-mini", "label": "o3 Mini"},
        {"value": "o1", "label": "o1"},
        {"value": "o1-mini", "label": "o1 Mini"},
    ],
    "groq": [
        {"value": "llama-3.3-70b-versatile", "label": "Llama 3.3 70B Versatile (recommended)"},
        {"value": "llama-3.1-8b-instant", "label": "Llama 3.1 8B Instant"},
        {"value": "llama3-70b-8192", "label": "Llama 3 70B"},
        {"value": "llama3-8b-8192", "label": "Llama 3 8B"},
        {"value": "gemma2-9b-it", "label": "Gemma 2 9B IT"},
        {"value": "meta-llama/llama-4-maverick-17b-128e-instruct", "label": "Llama 4 Maverick 17B"},
        {"value": "meta-llama/llama-4-scout-17b-16e-instruct", "label": "Llama 4 Scout 17B"},
    ],
    "anthropic": [
        {"value": "claude-3-7-sonnet-20250219", "label": "Claude 3.7 Sonnet (recommended)"},
        {"value": "claude-3-5-sonnet-20241022", "label": "Claude 3.5 Sonnet"},
        {"value": "claude-3-5-haiku-20241022", "label": "Claude 3.5 Haiku"},
        {"value": "claude-3-5-sonnet-20240620", "label": "Claude 3.5 Sonnet (June)"},
    ],
    "gemini": [
        {"value": "gemini-pro", "label": "Gemini Pro"},
        {"value": "gemini-ultra", "label": "Gemini Ultra"},
    ],
}

LLM_DEFAULT_MODEL = {
    "openai": "gpt-4o-mini",
    "groq": "llama-3.3-70b-versatile",
    "anthropic": "claude-3-7-sonnet-20250219",
    "gemini": "gemini-pro",
}

TTS_VOICES_BY_PROVIDER = {
    "openai": [
        {"value": "alloy", "label": "Alloy"},
        {"value": "ash", "label": "Ash"},
        {"value": "ballad", "label": "Ballad"},
        {"value": "coral", "label": "Coral"},
        {"value": "echo", "label": "Echo"},
        {"value": "fable", "label": "Fable"},
        {"value": "onyx", "label": "Onyx"},
        {"value": "nova", "label": "Nova"},
        {"value": "sage", "label": "Sage"},
        {"value": "shimmer", "label": "Shimmer"},
        {"value": "verse", "label": "Verse"},
    ],
    "groq": [
        {"value": "Arista-PlayAI", "label": "Arista"},
        {"value": "Atlas-PlayAI", "label": "Atlas"},
        {"value": "Basil-PlayAI", "label": "Basil"},
        {"value": "Briggs-PlayAI", "label": "Briggs"},
        {"value": "Calum-PlayAI", "label": "Calum"},
        {"value": "Celeste-PlayAI", "label": "Celeste"},
        {"value": "Cheyenne-PlayAI", "label": "Cheyenne"},
        {"value": "Chip-PlayAI", "label": "Chip"},
        {"value": "Cillian-PlayAI", "label": "Cillian"},
        {"value": "Deedee-PlayAI", "label": "Deedee"},
        {"value": "Fritz-PlayAI", "label": "Fritz"},
        {"value": "Gail-PlayAI", "label": "Gail"},
        {"value": "Indigo-PlayAI", "label": "Indigo"},
        {"value": "Mamaw-PlayAI", "label": "Mamaw"},
        {"value": "Mason-PlayAI", "label": "Mason"},
        {"value": "Mikail-PlayAI", "label": "Mikail"},
        {"value": "Mitch-PlayAI", "label": "Mitch"},
        {"value": "Quinn-PlayAI", "label": "Quinn"},
        {"value": "Thunder-PlayAI", "label": "Thunder"},
    ],
    "elevenlabs": [
        {"value": "Adam", "label": "Adam"},
        {"value": "Alice", "label": "Alice"},
        {"value": "Antoni", "label": "Antoni"},
        {"value": "Aria", "label": "Aria"},
        {"value": "Arnold", "label": "Arnold"},
        {"value": "Bill", "label": "Bill"},
        {"value": "Brian", "label": "Brian"},
        {"value": "Callum", "label": "Callum"},
        {"value": "Charlie", "label": "Charlie"},
        {"value": "Charlotte", "label": "Charlotte"},
        {"value": "Chris", "label": "Chris"},
        {"value": "Daniel", "label": "Daniel"},
        {"value": "Dave", "label": "Dave"},
        {"value": "Dorothy", "label": "Dorothy"},
        {"value": "Drew", "label": "Drew"},
        {"value": "Emily", "label": "Emily"},
        {"value": "Eric", "label": "Eric"},
        {"value": "Freya", "label": "Freya"},
        {"value": "George", "label": "George"},
        {"value": "Grace", "label": "Grace"},
        {"value": "Harry", "label": "Harry"},
        {"value": "James", "label": "James"},
        {"value": "Jessica", "label": "Jessica"},
        {"value": "Josh", "label": "Josh"},
        {"value": "Laura", "label": "Laura"},
        {"value": "Liam", "label": "Liam"},
        {"value": "Lily", "label": "Lily"},
        {"value": "Matilda", "label": "Matilda"},
        {"value": "Michael", "label": "Michael"},
        {"value": "Nicole", "label": "Nicole"},
        {"value": "Patrick", "label": "Patrick"},
        {"value": "Rachel", "label": "Rachel"},
        {"value": "Sam", "label": "Sam"},
        {"value": "Sarah", "label": "Sarah"},
        {"value": "Thomas", "label": "Thomas"},
    ],
    "cartesia": [
        {"value": "bf0a246a-8642-498a-9950-80c35e9276b5", "label": "Sophie"},
        {"value": "78ab82d5-25be-4f7d-82b3-7ad64e5b85b2", "label": "Savannah"},
        {"value": "6f84f4b8-58a2-430c-8c79-688dad597532", "label": "Brooke"},
        {"value": "a8a1eb38-5f15-4c1d-8722-7ac0f329727d", "label": "Calm French Woman"},
        {"value": "5c29d7e3-a133-4c7e-804a-1d9c6dea83f6", "label": "Marta"},
        {"value": "3a63e2d1-1c1e-425d-8e79-5100bc910e90", "label": "Chinese Call Center Man"},
        {"value": "c99d36f3-5ffd-4253-803a-535c1bc9c306", "label": "Griffin"},
        {"value": "32b3f3c5-7171-46aa-abe7-b598964aa793", "label": "Zia"},
        {"value": "79743797-2087-422f-8dc7-86f9efca85f1", "label": "Mateo"},
        {"value": "c8605446-247c-4d39-acd4-8f4c28aa363c", "label": "Wise Lady"},
    ],
    "kokoro": [
        {"value": "af_alloy", "label": "Alloy (Female)"},
        {"value": "af_bella", "label": "Bella (Female)"},
        {"value": "af_heart", "label": "Heart (Female)"},
        {"value": "af_jessica", "label": "Jessica (Female)"},
        {"value": "af_nicole", "label": "Nicole (Female)"},
        {"value": "af_nova", "label": "Nova (Female)"},
        {"value": "af_river", "label": "River (Female)"},
        {"value": "af_sarah", "label": "Sarah (Female)"},
        {"value": "af_sky", "label": "Sky (Female)"},
        {"value": "am_adam", "label": "Adam (Male)"},
        {"value": "am_echo", "label": "Echo (Male)"},
        {"value": "am_eric", "label": "Eric (Male)"},
        {"value": "am_liam", "label": "Liam (Male)"},
        {"value": "am_michael", "label": "Michael (Male)"},
        {"value": "am_onyx", "label": "Onyx (Male)"},
        {"value": "bf_alice", "label": "Alice (British Female)"},
        {"value": "bf_emma", "label": "Emma (British Female)"},
        {"value": "bf_lily", "label": "Lily (British Female)"},
        {"value": "bm_daniel", "label": "Daniel (British Male)"},
        {"value": "bm_george", "label": "George (British Male)"},
    ],
}

TTS_DEFAULT_VOICE = {
    "openai": "alloy",
    "groq": "Arista-PlayAI",
    "elevenlabs": "Rachel",
    "cartesia": "bf0a246a-8642-498a-9950-80c35e9276b5",
    "kokoro": "af_heart",
}


# ─── Tool Definitions (OpenAI function-calling format) ────────────────────────

AGENT_BUILDER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "list_llm_providers",
            "description": "List the user's configured LLM providers (e.g. OpenAI, Anthropic, Groq). Returns provider IDs, names, and model info. Call this to know which providers the user has available before creating an agent.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_tts_providers",
            "description": "List the user's configured TTS (Text-to-Speech) providers (e.g. OpenAI TTS, Cartesia, ElevenLabs). Returns provider IDs, names, voice info. Call this to know which TTS providers the user has available.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_rag_databases",
            "description": "List the user's configured RAG (Retrieval-Augmented Generation) vector databases and their collections. Returns database IDs, names, collection names, and file counts. Call this if the user wants their agent to have access to a knowledge base.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_existing_agents",
            "description": "List the user's existing agents. Returns agent IDs, names, and descriptions. Useful to check what already exists before creating a new one.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_agent",
            "description": "Create a new AI agent with the specified configuration. Call this ONLY after you have gathered all necessary information from the user and they have confirmed. This is the final step.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The name of the agent (e.g. 'Sales Agent', 'Support Agent')"
                    },
                    "instructions": {
                        "type": "string",
                        "description": "Detailed instructions for how the agent should behave, respond, and what its role is. Be thorough and specific."
                    },
                    "llm_provider_id": {
                        "type": "string",
                        "description": "UUID of the user's LLM provider to use (from list_llm_providers)"
                    },
                    "llm_model": {
                        "type": "string",
                        "description": "The LLM model name to use (e.g. 'gpt-4o', 'claude-3-5-sonnet-20241022', 'llama-3.3-70b-versatile')"
                    },
                    "llm_config": {
                        "type": "object",
                        "description": "LLM configuration object. Must include 'provider' key matching the provider name (e.g. {\"provider\": \"openai\"})",
                        "properties": {
                            "provider": {"type": "string"},
                            "voice": {"type": "string"}
                        }
                    },
                    "tts_provider_id": {
                        "type": "string",
                        "description": "UUID of the user's TTS provider to use (from list_tts_providers). Optional."
                    },
                    "voice_id": {
                        "type": "string",
                        "description": "Voice ID for the TTS provider. Optional."
                    },
                    "collection_fields": {
                        "type": "array",
                        "description": "Data fields the agent should collect from users during conversation. Optional.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "Field name (no spaces, e.g. 'full_name', 'email', 'phone_number')"
                                },
                                "type": {
                                    "type": "string",
                                    "enum": ["text", "number", "list", "boolean", "payment"],
                                    "description": "Data type of the field"
                                },
                                "required": {
                                    "type": "boolean",
                                    "description": "Whether this field is required"
                                }
                            },
                            "required": ["name", "type", "required"]
                        }
                    },
                    "rag_config": {
                        "type": "array",
                        "description": "RAG knowledge base configuration. Optional. Each item links to a vector DB collection.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string", "description": "Vector DB UUID"},
                                "collection_name": {"type": "string"},
                                "embedding_model": {"type": "string"},
                                "description": {"type": "string"}
                            },
                            "required": ["id", "collection_name", "embedding_model"]
                        }
                    },
                    "tools": {
                        "type": "array",
                        "description": "External API tools the agent can call. Optional.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string", "description": "Tool name (no spaces)"},
                                "description": {"type": "string", "description": "What the tool does"},
                                "endpoint_url": {"type": "string", "description": "API endpoint URL"},
                                "method": {"type": "string", "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"]},
                                "auth_type": {"type": "string", "enum": ["none", "api_key", "bearer", "basic"], "description": "Authentication type"},
                                "auth_config": {"type": "object", "description": "Auth configuration (e.g. {\"token\": \"...\", \"type\": \"bearer\"})"},
                                "request_schema": {"type": "string", "description": "JSON schema string for the request body"},
                                "response_schema": {"type": "string", "description": "JSON schema string for expected response"}
                            },
                            "required": ["name", "description"]
                        }
                    }
                },
                "required": ["name", "instructions"]
            }
        }
    }
]


# ─── System Prompt ────────────────────────────────────────────────────────────

AGENT_BUILDER_SYSTEM_PROMPT = """You are the UtterTuple AI Builder Assistant. Your job is to help users create AI voice agents through a natural conversation.

You guide users through creating an agent by collecting the following information step by step:

**Step 1 - Basic Information (REQUIRED):**
- Agent Name: A clear, descriptive name
- Instructions: Detailed instructions for how the agent should behave. You should help the user write thorough instructions.
- Data Collection Fields (optional): Fields the agent should collect from callers (e.g. name, email, phone). Each field has a name, type (text/number/list/boolean/payment), and whether it's required.

**Step 2 - Model Configuration (REQUIRED):**
- LLM Provider: Call `list_llm_providers` to see the user's configured providers. The response includes `available_models` for each provider.
- LLM Model: After showing the user their provider(s), you MUST ask them to pick a specific model from the `available_models` list. Present the models with their labels. If the user doesn't have a preference, suggest the one marked "(recommended)" or the `default_model` value.
- TTS Provider: Call `list_tts_providers` to see the user's configured TTS providers. The response includes `available_voices` for each provider.
- TTS Voice: After showing the user their TTS provider(s), you MUST ask them to pick a specific voice from the `available_voices` list. Present a short curated selection (5-8 popular options) and mention more are available. If the user doesn't have a preference, suggest the `default_voice` value.

**Step 3 - RAG Configuration (OPTIONAL):**
- Knowledge Base: If the agent needs access to documents/knowledge. Call `list_rag_databases` to see what's available.

**Step 4 - Tools Configuration (OPTIONAL):**
- External API tools the agent can call during conversations (e.g. check order status, look up inventory).

**CRITICAL RULES FOR MODEL & VOICE SELECTION:**
- You MUST pass the user's chosen `llm_model` value (exact string from `available_models`) to `create_agent`. Never omit it.
- You MUST pass the user's chosen `voice_id` value (exact string from `available_voices`) to `create_agent`. Never omit it.
- You MUST also pass `llm_config` with at minimum `{"provider": "<provider_name_lowercase>"}`.
- When creating the agent, always set `llm_provider_id` to the provider's UUID and `tts_provider_id` to the TTS provider's UUID.

**OTHER RULES:**
1. Start by asking what kind of agent the user wants to create. Be friendly and conversational.
2. Help the user write good instructions - suggest improvements and be thorough.
3. ALWAYS call `list_llm_providers` and `list_tts_providers` BEFORE asking about model/voice selection so you can present real choices.
4. Only ask about RAG and Tools if the user indicates interest, or if it seems relevant to their use case.
5. Before calling `create_agent`, summarize the full configuration (including the exact model name and voice name) and ask for confirmation.
6. After creating the agent, congratulate the user and let them know they can find it in the Agents page or use it in a workflow.
7. If the user doesn't have any LLM providers configured, let them know they need to set one up in Settings first.
8. Keep responses concise but helpful. Don't overwhelm with too many questions at once.
9. For collection field names, always use snake_case without spaces (e.g. 'full_name' not 'Full Name').
"""


# ─── Workflow Builder Tool Definitions ────────────────────────────────────────

WORKFLOW_BUILDER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "list_existing_agents",
            "description": "List the user's existing agents. Returns agent IDs, names, and descriptions. Call this to see which agents can be added to the workflow.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_existing_workflows",
            "description": "List the user's existing workflows. Returns workflow IDs and names for reference. Useful to avoid duplicate names.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_llm_providers",
            "description": "List the user's configured LLM providers. Needed when creating a new agent inline as part of workflow creation.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_tts_providers",
            "description": "List the user's configured TTS providers. Needed when creating a new agent inline as part of workflow creation.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_rag_databases",
            "description": "List the user's configured RAG vector databases. Needed when creating a new agent inline that requires knowledge base access.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_agent",
            "description": "Create a new AI agent inline during workflow building. Use this if the user needs a new agent that doesn't exist yet. After creation, use the returned agent_id in the workflow.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The name of the agent"
                    },
                    "instructions": {
                        "type": "string",
                        "description": "Detailed instructions for how the agent should behave."
                    },
                    "llm_provider_id": {
                        "type": "string",
                        "description": "UUID of the user's LLM provider"
                    },
                    "llm_model": {
                        "type": "string",
                        "description": "The LLM model name to use"
                    },
                    "llm_config": {
                        "type": "object",
                        "description": "LLM configuration. Must include 'provider' key.",
                        "properties": {
                            "provider": {"type": "string"},
                            "voice": {"type": "string"}
                        }
                    },
                    "tts_provider_id": {
                        "type": "string",
                        "description": "UUID of the user's TTS provider. Optional."
                    },
                    "voice_id": {
                        "type": "string",
                        "description": "Voice ID for the TTS provider. Optional."
                    },
                    "collection_fields": {
                        "type": "array",
                        "description": "Data fields the agent should collect. Optional.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "type": {"type": "string", "enum": ["text", "number", "list", "boolean", "payment"]},
                                "required": {"type": "boolean"}
                            },
                            "required": ["name", "type", "required"]
                        }
                    },
                    "rag_config": {
                        "type": "array",
                        "description": "RAG knowledge base configuration. Optional.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "collection_name": {"type": "string"},
                                "embedding_model": {"type": "string"},
                                "description": {"type": "string"}
                            },
                            "required": ["id", "collection_name", "embedding_model"]
                        }
                    },
                    "tools": {
                        "type": "array",
                        "description": "External API tools. Optional.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "description": {"type": "string"},
                                "endpoint_url": {"type": "string"},
                                "method": {"type": "string", "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"]},
                                "auth_type": {"type": "string", "enum": ["none", "api_key", "bearer", "basic"]},
                                "auth_config": {"type": "object"},
                                "request_schema": {"type": "string"},
                                "response_schema": {"type": "string"}
                            },
                            "required": ["name", "description"]
                        }
                    }
                },
                "required": ["name", "instructions"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_workflow",
            "description": "Create a new workflow with the specified agents, transitions, and configuration. Call this ONLY after you have gathered all information and the user has confirmed. This is the final step.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The name of the workflow (e.g. 'Sales Qualification Flow', 'Customer Support Pipeline')"
                    },
                    "initial_greeting": {
                        "type": "string",
                        "description": "The greeting message the caller hears when the call starts."
                    },
                    "agents": {
                        "type": "array",
                        "description": "Ordered list of agents in the workflow. The first agent receives calls after the greeting.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "agent_id": {
                                    "type": "string",
                                    "description": "UUID of an existing agent to include in the workflow"
                                },
                                "transitions": {
                                    "type": "array",
                                    "description": "Where this agent can route to. Each transition has a target and a condition.",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "target_agent_id": {
                                                "type": "string",
                                                "description": "UUID of the target agent, or the literal string 'end' to end the call"
                                            },
                                            "condition_description": {
                                                "type": "string",
                                                "description": "Human-readable description of when this transition should happen (e.g. 'When the customer wants to speak to billing', 'When the issue is resolved')"
                                            }
                                        },
                                        "required": ["target_agent_id", "condition_description"]
                                    }
                                }
                            },
                            "required": ["agent_id"]
                        }
                    },
                    "default_context": {
                        "type": "object",
                        "description": "Optional workflow-level context data passed to all agents."
                    }
                },
                "required": ["name", "initial_greeting", "agents"]
            }
        }
    }
]


# ─── Workflow Builder System Prompt ───────────────────────────────────────────

WORKFLOW_BUILDER_SYSTEM_PROMPT = """You are the UtterTuple Workflow Builder Assistant. Your job is to help users create AI voice workflows through a natural conversation.

A workflow connects multiple AI agents together in a call flow. Callers start with a greeting, then talk to agents that can hand off to each other based on conditions.

You guide users through creating a workflow by collecting the following information step by step:

**Step 1 - Workflow Basics (REQUIRED):**
- Workflow Name: A clear, descriptive name (e.g. "Sales Qualification Flow", "Customer Support Pipeline")
- Initial Greeting: What the caller hears when the call starts (e.g. "Hello! Thank you for calling Acme Corp. How can I help you today?")

**Step 2 - Agent Selection (REQUIRED):**
- Call `list_existing_agents` to see what agents the user already has.
- Ask which agents should be part of this workflow. The user needs at least one agent.
- If the user needs a new agent that doesn't exist yet, you can create one inline using `create_agent`. To do this, follow the same process as agent creation: gather name, instructions, LLM/TTS config, etc. Use `list_llm_providers` and `list_tts_providers` to get provider info.
- Identify which agent should be the FIRST agent (the one that handles the initial conversation after the greeting).

**Step 3 - Flow Definition (REQUIRED):**
- For each agent, ask about transitions: where can this agent hand off to?
- Each transition needs:
  - A target: another agent in the workflow, or "end" (to end the call)
  - A condition: when should this transition happen (e.g. "When the customer asks about billing", "When the issue is resolved")
- Every agent should have at least one transition (even if it's just "end the call when the conversation is complete").
- Make sure the flow makes logical sense and there are no dead ends without an "end" transition.

**Step 4 - Confirmation and Creation:**
- Summarize the complete workflow:
  - Name and greeting
  - All agents and their roles
  - All transitions with conditions
- Ask for confirmation
- Call `create_workflow` with the complete configuration

**RULES:**
1. Start by asking what kind of workflow the user wants to create. Be friendly and conversational.
2. ALWAYS call `list_existing_agents` first so you know what's available.
3. If the user has no agents, help them create the needed agents inline before building the workflow.
4. Keep the flow simple and logical. Suggest common patterns (e.g. receptionist -> specialist -> end).
5. Before calling `create_workflow`, present a clear summary and get explicit confirmation.
6. After creating the workflow, congratulate the user and let them know they can find it in the Workflows page and further customize it visually.
7. Keep responses concise but helpful. Don't overwhelm with too many questions at once.
8. The first agent in the `agents` array will be connected to the Start node automatically.
9. Use `list_existing_workflows` if you need to check for duplicate names.
"""


# ─── Orchestrator (Auto-detect) Prompt & Tools ───────────────────────────────
# Combines both agent and workflow building into a single agent that detects
# the user's intent automatically and uses the appropriate tools.

ORCHESTRATOR_SYSTEM_PROMPT = """You are the UtterTuple AI Builder Assistant. You help users create AI voice agents AND voice call workflows through natural conversation.

**Your two capabilities:**

1. **Agent Creation** — Create individual AI voice agents with LLM/TTS configuration, instructions, RAG knowledge bases, and API tools.
2. **Workflow Creation** — Create multi-agent call workflows that connect agents together with transitions and conditions.

**How to decide what the user wants:**
- If the user mentions "workflow", "flow", "pipeline", "call flow", "connect agents", "multi-agent", "routing", "hand-off", or describes a process with multiple steps/agents → they want a **workflow**.
- If the user mentions "agent", "bot", "assistant", "voice agent", or describes a single agent's behavior → they want an **agent**.
- If it's ambiguous, ask the user: "Would you like to create a single agent, or a workflow that connects multiple agents together?"

---

## AGENT CREATION FLOW

When creating an **agent**, guide the user through these steps:

**Step 1 - Basic Information (REQUIRED):**
- Agent Name: A clear, descriptive name
- Instructions: Detailed instructions for how the agent should behave. Help the user write thorough instructions.
- Data Collection Fields (optional): Fields the agent should collect from callers (name, type, required).

**Step 2 - Model Configuration (REQUIRED):**
- LLM Provider: Call `list_llm_providers` to see available providers. Ask the user to pick a model from `available_models`.
- TTS Provider: Call `list_tts_providers` to see available providers. Ask the user to pick a voice from `available_voices`.

**Step 3 - RAG Configuration (OPTIONAL):**
- Knowledge Base: Call `list_rag_databases` if the user needs document access.

**Step 4 - Tools Configuration (OPTIONAL):**
- External API tools the agent can call during conversations.

**Agent Creation Rules:**
- You MUST pass the exact `llm_model` and `voice_id` values to `create_agent`.
- You MUST pass `llm_config` with `{"provider": "<provider_name_lowercase>"}`.
- Always set `llm_provider_id` and `tts_provider_id` to the provider UUIDs.
- Before calling `create_agent`, summarize the configuration and ask for confirmation.
- For collection field names, use snake_case (e.g. 'full_name' not 'Full Name').

---

## WORKFLOW CREATION FLOW

When creating a **workflow**, guide the user through these steps:

**Step 1 - Workflow Basics (REQUIRED):**
- Workflow Name (e.g. "Sales Qualification Flow")
- Initial Greeting (what the caller hears first)

**Step 2 - Agent Selection (REQUIRED):**
- Call `list_existing_agents` to see available agents.
- The user needs at least one agent. If they need new agents, create them inline using `create_agent` (follow the agent creation flow above).
- Identify which agent is FIRST (handles the initial conversation).

**Step 3 - Flow Definition (REQUIRED):**
- For each agent, define transitions: where can it hand off?
- Each transition needs a target (another agent or "end") and a condition (when it triggers).
- Every agent should have at least one transition.

**Step 4 - Confirmation and Creation:**
- Summarize the complete workflow and ask for confirmation.
- Call `create_workflow` with the full configuration.

**Workflow Creation Rules:**
- ALWAYS call `list_existing_agents` before asking about agent selection.
- The first agent in the `agents` array connects to the Start node automatically.
- Use `list_existing_workflows` to check for duplicate names if needed.

---

## GENERAL RULES
1. Start by asking what the user wants to build. Be friendly and conversational.
2. Keep responses concise but helpful. Don't overwhelm with too many questions at once.
3. ALWAYS call the listing tools before asking about model/voice/agent selection.
4. Before creating anything, summarize the full configuration and get explicit confirmation.
5. After creation, congratulate the user and tell them where to find it (Agents page or Workflows page).
6. If the user doesn't have LLM providers configured, let them know to set one up in Settings first.
"""

# The orchestrator has access to ALL tools from both builders (deduplicated)
ORCHESTRATOR_TOOLS = [
    # Shared listing tools
    {
        "type": "function",
        "function": {
            "name": "list_llm_providers",
            "description": "List the user's configured LLM providers (e.g. OpenAI, Anthropic, Groq). Returns provider IDs, names, and available models.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_tts_providers",
            "description": "List the user's configured TTS providers (e.g. OpenAI TTS, Cartesia, ElevenLabs). Returns provider IDs, names, and available voices.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_rag_databases",
            "description": "List the user's configured RAG vector databases and collections.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_existing_agents",
            "description": "List the user's existing agents. Returns agent IDs, names, and descriptions.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_existing_workflows",
            "description": "List the user's existing workflows. Returns workflow IDs and names.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    # Agent creation tool
    {
        "type": "function",
        "function": {
            "name": "create_agent",
            "description": "Create a new AI agent. Call this after gathering all information and the user confirms. Works for standalone agents and for creating agents inline during workflow building.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Agent name"},
                    "instructions": {"type": "string", "description": "Detailed behavior instructions"},
                    "llm_provider_id": {"type": "string", "description": "UUID of LLM provider"},
                    "llm_model": {"type": "string", "description": "LLM model name"},
                    "llm_config": {
                        "type": "object",
                        "description": "LLM config with 'provider' key",
                        "properties": {"provider": {"type": "string"}, "voice": {"type": "string"}}
                    },
                    "tts_provider_id": {"type": "string", "description": "UUID of TTS provider (optional)"},
                    "voice_id": {"type": "string", "description": "Voice ID (optional)"},
                    "collection_fields": {
                        "type": "array",
                        "description": "Data fields to collect (optional)",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "type": {"type": "string", "enum": ["text", "number", "list", "boolean", "payment"]},
                                "required": {"type": "boolean"}
                            },
                            "required": ["name", "type", "required"]
                        }
                    },
                    "rag_config": {
                        "type": "array",
                        "description": "RAG config (optional)",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "collection_name": {"type": "string"},
                                "embedding_model": {"type": "string"},
                                "description": {"type": "string"}
                            },
                            "required": ["id", "collection_name", "embedding_model"]
                        }
                    },
                    "tools": {
                        "type": "array",
                        "description": "External API tools (optional)",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "description": {"type": "string"},
                                "endpoint_url": {"type": "string"},
                                "method": {"type": "string", "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"]},
                                "auth_type": {"type": "string", "enum": ["none", "api_key", "bearer", "basic"]},
                                "auth_config": {"type": "object"},
                                "request_schema": {"type": "string"},
                                "response_schema": {"type": "string"}
                            },
                            "required": ["name", "description"]
                        }
                    }
                },
                "required": ["name", "instructions"]
            }
        }
    },
    # Workflow creation tool
    {
        "type": "function",
        "function": {
            "name": "create_workflow",
            "description": "Create a new workflow connecting multiple agents. Call this after gathering all information and the user confirms.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Workflow name"},
                    "initial_greeting": {"type": "string", "description": "Greeting the caller hears first"},
                    "agents": {
                        "type": "array",
                        "description": "Ordered list of agents. First agent receives calls after greeting.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "agent_id": {"type": "string", "description": "UUID of existing agent"},
                                "transitions": {
                                    "type": "array",
                                    "description": "Where this agent can route to",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "target_agent_id": {"type": "string", "description": "Target agent UUID or 'end'"},
                                            "condition_description": {"type": "string", "description": "When this transition triggers"}
                                        },
                                        "required": ["target_agent_id", "condition_description"]
                                    }
                                }
                            },
                            "required": ["agent_id"]
                        }
                    },
                    "default_context": {"type": "object", "description": "Optional workflow-level context"}
                },
                "required": ["name", "initial_greeting", "agents"]
            }
        }
    }
]


class AIChatBuilderManager:
    def __init__(self, db_session: Session, provider_manager: ProviderManager,
                 agent_manager: AgentManager, security_manager: SecurityManager,
                 workflow_manager: WorkflowManager = None):
        self.db = db_session
        self.provider_manager = provider_manager
        self.agent_manager = agent_manager
        self.security_manager = security_manager
        self.workflow_manager = workflow_manager

    # ─── Tool Execution ──────────────────────────────────────────────────────

    def execute_tool(self, tool_name: str, tool_args: dict, user_id: str, organization_id: str) -> str:
        """Execute a tool call and return the result as a JSON string."""
        try:
            if tool_name == "list_llm_providers":
                providers = self.provider_manager.get_user_llm_data(user_id=user_id)
                result = []
                for p in providers:
                    provider_key = p.provider_name.lower()
                    available_models = LLM_MODELS_BY_PROVIDER.get(provider_key, [])
                    default_model = LLM_DEFAULT_MODEL.get(provider_key, "gpt-4o-mini")
                    result.append({
                        "id": str(p.id),
                        "provider_name": p.provider_name,
                        "model_name": p.model_name,
                        "available_models": available_models,
                        "default_model": default_model,
                    })
                if not result:
                    return json.dumps({"message": "No LLM providers configured. The user needs to add one in Settings > LLM Providers first.", "providers": []})
                return json.dumps({"providers": result})

            elif tool_name == "list_tts_providers":
                providers = self.provider_manager.get_user_tts_data(
                    user_id=user_id, organization_id=organization_id
                )
                result = []
                for p in providers:
                    provider_key = p.provider_name.lower()
                    available_voices = TTS_VOICES_BY_PROVIDER.get(provider_key, [])
                    default_voice = TTS_DEFAULT_VOICE.get(provider_key)
                    result.append({
                        "id": str(p.id),
                        "provider_name": p.provider_name,
                        "model_name": p.model_name,
                        "voice": p.voice,
                        "available_voices": available_voices,
                        "default_voice": default_voice,
                    })
                if not result:
                    return json.dumps({"message": "No TTS providers configured. The user can add one in Settings > TTS Providers, or skip voice configuration for now.", "providers": []})
                return json.dumps({"providers": result})

            elif tool_name == "list_rag_databases":
                vector_dbs = self.db.query(RAGVectorDB).filter(
                    RAGVectorDB.user_id == user_id,
                    RAGVectorDB.organization_id == organization_id
                ).all()
                result = []
                for vdb in vector_dbs:
                    files = self.db.query(RAGFileUpload).filter(
                        RAGFileUpload.vector_db_id == vdb.id,
                        RAGFileUpload.user_id == user_id,
                        RAGFileUpload.organization_id == organization_id,
                        RAGFileUpload.status == 'completed'
                    ).all()
                    collections = {}
                    for f in files:
                        if f.index_name not in collections:
                            collections[f.index_name] = {
                                "collection_name": f.index_name,
                                "embedding_model": f.embedding_model,
                                "embedding_provider": f.embedding_provider,
                                "description": f.description or "",
                                "file_count": 0
                            }
                        collections[f.index_name]["file_count"] += 1

                    result.append({
                        "id": str(vdb.id),
                        "name": vdb.name,
                        "db_type": vdb.db_type,
                        "collections": list(collections.values())
                    })
                if not result:
                    return json.dumps({"message": "No RAG databases configured. The user can set one up in the RAG section.", "databases": []})
                return json.dumps({"databases": result})

            elif tool_name == "list_existing_agents":
                agents = self.agent_manager.get_by_user_id(
                    user_id=user_id, organization_id=organization_id
                )
                result = []
                for a in agents:
                    result.append({
                        "id": str(a.id),
                        "name": a.name,
                        "description": (a.instructions or "")[:100] + ("..." if a.instructions and len(a.instructions) > 100 else "")
                    })
                return json.dumps({"agents": result, "count": len(result)})

            elif tool_name == "create_agent":
                return self._create_agent(tool_args, user_id, organization_id)

            elif tool_name == "list_existing_workflows":
                return self._list_existing_workflows(user_id, organization_id)

            elif tool_name == "create_workflow":
                return self._create_workflow(tool_args, user_id, organization_id)

            else:
                return json.dumps({"error": f"Unknown tool: {tool_name}"})

        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {str(e)}")
            return json.dumps({"error": f"Failed to execute {tool_name}: {str(e)}"})

    def _create_agent(self, tool_args: dict, user_id: str, organization_id: str) -> str:
        """Build an AgentCreate schema from tool arguments and persist the agent."""
        collection_fields = []
        for cf in tool_args.get("collection_fields", []):
            collection_fields.append(CollectionFieldSchema(
                name=cf["name"].replace(" ", "_").lower(),
                type=cf["type"],
                required=cf.get("required", False)
            ))

        tools = []
        for t in tool_args.get("tools", []):
            tools.append(AgentToolCreate(
                name=t["name"].replace(" ", ""),
                description=t["description"],
                endpoint_url=t.get("endpoint_url"),
                method=t.get("method"),
                auth_type=t.get("auth_type"),
                auth_config=t.get("auth_config"),
                request_schema=t.get("request_schema"),
                response_schema=t.get("response_schema"),
            ))

        rag_config = None
        if tool_args.get("rag_config"):
            rag_config = []
            for rc in tool_args["rag_config"]:
                rag_config.append(RAGDatabaseConfigSchema(
                    id=rc["id"],
                    collection_name=rc["collection_name"],
                    embedding_model=rc["embedding_model"],
                    description=rc.get("description", "")
                ))

        llm_config = tool_args.get("llm_config")

        agent_create = AgentCreate(
            name=tool_args["name"],
            instructions=tool_args["instructions"],
            voice_id=tool_args.get("voice_id"),
            collection_fields=collection_fields,
            llm_provider_id=tool_args.get("llm_provider_id"),
            llm_model=tool_args.get("llm_model"),
            llm_config=llm_config,
            tts_provider_id=tool_args.get("tts_provider_id"),
            rag_config=rag_config,
            tools=tools if tools else [],
        )

        agent = self.agent_manager.create(
            user_id=user_id,
            organization_id=organization_id,
            obj_in=agent_create
        )

        return json.dumps({
            "success": True,
            "agent_id": str(agent.id),
            "agent_name": agent.name,
            "message": f"Agent '{agent.name}' created successfully!"
        })

    # ─── Workflow Tool Handlers ───────────────────────────────────────────────

    def _list_existing_workflows(self, user_id: str, organization_id: str) -> str:
        """List the user's existing workflows."""
        workflows = self.workflow_manager.get_by_user_id(
            user_id=user_id, organization_id=organization_id
        )
        result = []
        for w in workflows:
            result.append({
                "id": str(w.id),
                "name": w.name,
                "node_count": len(w.nodes) if w.nodes else 0,
            })
        return json.dumps({"workflows": result, "count": len(result)})

    def _create_workflow(self, tool_args: dict, user_id: str, organization_id: str) -> str:
        """Create a complete workflow with Start/End nodes, agent nodes, and edges."""
        if not self.workflow_manager:
            return json.dumps({"error": "Workflow manager not available."})

        name = tool_args.get("name")
        initial_greeting = tool_args.get("initial_greeting", "")
        agents_list = tool_args.get("agents", [])
        default_context = tool_args.get("default_context", {})

        if not name:
            return json.dumps({"error": "Workflow name is required."})
        if not agents_list:
            return json.dumps({"error": "At least one agent is required in the workflow."})

        try:
            # 1. Create the workflow record
            workflow_create = WorkflowCreate(
                name=name,
                initial_greeting=initial_greeting,
                default_context=default_context,
            )
            workflow = self.workflow_manager.create(
                user_id=user_id,
                organization_id=organization_id,
                obj_in=workflow_create,
            )
            workflow_id = str(workflow.id)

            # 2. Create START node
            start_node = self.workflow_manager.create_node(
                workflow_id=workflow_id,
                user_id=user_id,
                organization_id=organization_id,
                obj_in=WorkflowNodeCreate(
                    node_type=NodeType.START,
                    position_x=50.0,
                    position_y=300.0,
                    data={"label": "Start"},
                ),
            )

            # 3. Create AGENT nodes (spaced horizontally)
            agent_nodes = {}
            x_offset = 350.0
            x_spacing = 350.0
            for idx, agent_entry in enumerate(agents_list):
                agent_id = agent_entry.get("agent_id")
                if not agent_id:
                    continue

                # Look up the agent to get its name for the node label
                agent_obj = self.agent_manager.get_by_id(
                    agent_id=agent_id, user_id=user_id, organization_id=organization_id
                )
                agent_label = agent_obj.name if agent_obj else f"Agent {idx + 1}"

                agent_node = self.workflow_manager.create_node(
                    workflow_id=workflow_id,
                    user_id=user_id,
                    organization_id=organization_id,
                    obj_in=WorkflowNodeCreate(
                        agent_id=agent_id,
                        node_type=NodeType.AGENT,
                        position_x=x_offset + (idx * x_spacing),
                        position_y=300.0,
                        data={"label": agent_label},
                    ),
                )
                agent_nodes[agent_id] = agent_node

            # 4. Create END node
            end_x = x_offset + (len(agents_list) * x_spacing)
            end_node = self.workflow_manager.create_node(
                workflow_id=workflow_id,
                user_id=user_id,
                organization_id=organization_id,
                obj_in=WorkflowNodeCreate(
                    node_type=NodeType.END,
                    position_x=end_x,
                    position_y=300.0,
                    data={"label": "End"},
                ),
            )

            # 5. Create edge: START -> first agent
            first_agent_id = agents_list[0].get("agent_id")
            if first_agent_id and first_agent_id in agent_nodes:
                self.workflow_manager.create_edge(
                    workflow_id=workflow_id,
                    user_id=user_id,
                    organization_id=organization_id,
                    obj_in=WorkflowEdgeCreate(
                        source_node_id=start_node.id,
                        target_node_id=agent_nodes[first_agent_id].id,
                        label="Start",
                    ),
                )

            # 6. Create transition edges for each agent
            for agent_entry in agents_list:
                agent_id = agent_entry.get("agent_id")
                if not agent_id or agent_id not in agent_nodes:
                    continue

                source_node = agent_nodes[agent_id]
                transitions = agent_entry.get("transitions", [])

                for transition in transitions:
                    target_agent_id = transition.get("target_agent_id", "")
                    condition_desc = transition.get("condition_description", "")

                    if target_agent_id.lower() == "end":
                        target_node = end_node
                    elif target_agent_id in agent_nodes:
                        target_node = agent_nodes[target_agent_id]
                    else:
                        continue

                    condition_data = {}
                    if condition_desc:
                        condition_data = {
                            "type": "ai",
                            "description": condition_desc,
                        }

                    self.workflow_manager.create_edge(
                        workflow_id=workflow_id,
                        user_id=user_id,
                        organization_id=organization_id,
                        obj_in=WorkflowEdgeCreate(
                            source_node_id=source_node.id,
                            target_node_id=target_node.id,
                            condition=condition_data,
                            label=condition_desc[:50] if condition_desc else "",
                        ),
                    )

            return json.dumps({
                "success": True,
                "workflow_id": workflow_id,
                "workflow_name": name,
                "message": f"Workflow '{name}' created successfully with {len(agent_nodes)} agent(s)!"
            })

        except Exception as e:
            logger.error(f"Error creating workflow: {str(e)}")
            return json.dumps({"error": f"Failed to create workflow: {str(e)}"})

    # ─── LLM Client Setup ────────────────────────────────────────────────────

    def get_llm_client_and_model(self, user_id: str, llm_provider_id: str):
        """Resolve the user's LLM provider, decrypt API key, and return (OpenAI client, model_name)."""
        llm_data = self.provider_manager.get_user_llm_data_by_id(
            user_id=user_id, data_id=llm_provider_id
        )
        if not llm_data:
            return None, None

        api_key = self.provider_manager.get_decrypted_llm_api_key(db_obj=llm_data)
        provider_name = llm_data.provider_name.lower()

        base_url = None
        default_model = LLM_DEFAULT_MODEL.get(provider_name, "gpt-4o-mini")

        if provider_name == "anthropic":
            base_url = "https://api.anthropic.com/v1/"
        elif provider_name == "groq":
            base_url = "https://api.groq.com/openai/v1"

        model = llm_data.model_name or default_model

        client_kwargs = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url
        client = OpenAI(**client_kwargs)

        return client, model

    # ─── SSE Stream Generation ────────────────────────────────────────────────

    async def generate_sse(self, messages: List[dict], client: OpenAI,
                           model: str, user_id: str, organization_id: str,
                           mode: str = "agent") -> AsyncGenerator[str, None]:
        """Async generator that handles the tool-calling loop and yields SSE events."""
        # Select the right tools based on mode
        if mode == "workflow":
            tools = WORKFLOW_BUILDER_TOOLS
        elif mode == "agent":
            tools = AGENT_BUILDER_TOOLS
        else:
            tools = ORCHESTRATOR_TOOLS

        max_iterations = 10
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    tools=tools,
                    tool_choice="auto",
                )

                choice = response.choices[0]
                assistant_message = choice.message

                if assistant_message.tool_calls:
                    messages.append({
                        "role": "assistant",
                        "content": assistant_message.content or "",
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {
                                    "name": tc.function.name,
                                    "arguments": tc.function.arguments
                                }
                            }
                            for tc in assistant_message.tool_calls
                        ]
                    })

                    for tool_call in assistant_message.tool_calls:
                        tool_name = tool_call.function.name
                        try:
                            tool_args = json.loads(tool_call.function.arguments)
                        except json.JSONDecodeError:
                            tool_args = {}

                        logger.info(f"Executing tool: {tool_name} with args: {tool_args}")

                        event_data = json.dumps({
                            "type": "tool_call",
                            "tool_name": tool_name,
                            "tool_args": tool_args
                        })
                        yield f"data: {event_data}\n\n"

                        tool_result = self.execute_tool(
                            tool_name, tool_args, user_id, organization_id
                        )

                        try:
                            result_data = json.loads(tool_result)
                            if tool_name == "create_agent" and result_data.get("success"):
                                event_data = json.dumps({
                                    "type": "agent_created",
                                    "agent_id": result_data["agent_id"],
                                    "agent_name": result_data["agent_name"]
                                })
                                yield f"data: {event_data}\n\n"
                            elif tool_name == "create_workflow" and result_data.get("success"):
                                event_data = json.dumps({
                                    "type": "workflow_created",
                                    "workflow_id": result_data["workflow_id"],
                                    "workflow_name": result_data["workflow_name"]
                                })
                                yield f"data: {event_data}\n\n"
                        except json.JSONDecodeError:
                            pass

                        event_data = json.dumps({
                            "type": "tool_result",
                            "tool_name": tool_name,
                            "result": tool_result
                        })
                        yield f"data: {event_data}\n\n"

                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": tool_result
                        })

                    continue

                else:
                    content = assistant_message.content or ""
                    event_data = json.dumps({
                        "type": "message",
                        "content": content
                    })
                    yield f"data: {event_data}\n\n"
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    return

            except Exception as e:
                logger.error(f"Error in AI Builder chat: {str(e)}")
                error_data = json.dumps({
                    "type": "error",
                    "content": f"An error occurred: {str(e)}"
                })
                yield f"data: {error_data}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

        error_data = json.dumps({
            "type": "error",
            "content": "The conversation reached the maximum number of tool call iterations. Please try again."
        })
        yield f"data: {error_data}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
