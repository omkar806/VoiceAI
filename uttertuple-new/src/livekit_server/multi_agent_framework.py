import json
import logging
import importlib
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Type, Union
import ast
from livekit.agents import JobContext, WorkerOptions, cli, llm , get_job_context
from livekit.agents.llm import function_tool
from livekit.agents.voice import Agent, AgentSession, RunContext
from livekit.agents.voice.room_io import RoomInputOptions
from livekit.plugins import cartesia, openai, silero,noise_cancellation,deepgram,anthropic,groq,elevenlabs
from openai.types.beta.realtime.session import TurnDetection,InputAudioTranscription
from livekit.protocol.sip import CreateSIPParticipantRequest, SIPParticipantInfo 
from livekit.api import LiveKitAPI as lkapi
from livekit import api
from livekit.protocol.sip import ListSIPInboundTrunkRequest , CreateSIPOutboundTrunkRequest, SIPOutboundTrunkInfo, ListSIPOutboundTrunkRequest
import os
import asyncio
# from livekit_server.security import decrypt_api_key
from dotenv import load_dotenv
import aiohttp
load_dotenv(".env")
# Set up logging
logger = logging.getLogger("dynamic-agent-system")
logger.setLevel(logging.INFO)

# RAG_API_BASE_URL = os.getenv("RAG_API_BASE_URL", "http://localhost:8001")
RAG_API_BASE_URL = "https://dev.uttertuple.com"
RAG_API_KEY = os.getenv("RAG_API_KEY", "")


# RAG utility functions
async def search_knowledge_base_api(user_id: str, workflow_id: str, agent_id: str, query: str,vector_db_config:Dict[str, Any],collection_name:str,vector_db_type:str,tts_api_key:str,embedding_provider:str,embedding_model:str) -> Dict:
    """Call the API to search the knowledge base"""
    try:
        async with aiohttp.ClientSession() as session: 
            headers = {"Authorization": f"Bearer {RAG_API_KEY}"} if RAG_API_KEY else {}
            data = {
                "user_id": user_id,
                "workflow_id": workflow_id,
                "agent_id": agent_id,
                "query": query,
                "vector_db_config": vector_db_config,
                "collection_name": collection_name,
                "vector_db_type": vector_db_type,
                "tts_api_key": tts_api_key,
                "embedding_provider": embedding_provider,
                "embedding_model": embedding_model
            }
            logger.info(f"Search params: {data}")
            logger.info(f"RAG API Base URL: {RAG_API_BASE_URL}")
            async with session.post(f"{RAG_API_BASE_URL}/api/v1/rag/search", 
                                   headers=headers, json=data) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"Failed to search knowledge base: {response.status}")
                    return {"error": f"Failed to search knowledge base: {response.status}"}
    except Exception as e:
        logger.error(f"Error in search_knowledge_base_api: {str(e)}")
        return {"error": str(e)}

#dispatch rule creation function

async def hangup_call(context: RunContext) -> str:
    """Hang up the call for all participants"""
    job_ctx = get_job_context()
    if job_ctx is None:
        return "Not running in a job context"
    try:
        # Delete the room to disconnect all participants
        await job_ctx.api.room.delete_room(
            api.DeleteRoomRequest(
                room=job_ctx.room.name,
            )
        )
        return "Call ended successfully"
    except Exception as e:
        logger.error(f"Error hanging up call: {str(e)}")
        return f"Error hanging up call: {str(e)}"

async def timeout_hangup(context: RunContext, final_message: str = "I haven't received a clear response. Thank you for calling, goodbye.") -> str:
    """Hang up the call after a conversation timeout"""
    try:
        # Say the final message before hanging up
        await context.session.generate_reply(instructions=final_message)
        # Reduced delay to make hangup quicker
        await asyncio.sleep(0.5)
        # Hang up the call
        return await hangup_call(context)
    except Exception as e:
        logger.error(f"Error in timeout hangup: {str(e)}")
        return f"Error in timeout hangup: {str(e)}"

async def transfer_call(context: RunContext, transfer_to: str, transfer_reason: str = "") -> str:
    """Transfer the call to another number
    
    Args:
        context: The run context
        transfer_to: Phone number to transfer to in E.164 format (e.g. +15105550123)
        transfer_reason: Optional reason for the transfer to explain to the caller
    """
    job_ctx = get_job_context()
    if job_ctx is None:
        return "Not running in a job context"
    
    participant_identity = transfer_to  # Using the number as identity
    
    # Let the message play fully before transferring
    instructions = "Inform the user that you're transferring them"
    if transfer_reason:
        instructions += f" because {transfer_reason}"
    
    try:
        await context.session.generate_reply(instructions=instructions)
        
        # Give time for the message to play before initiating transfer
        await asyncio.sleep(0.5)
        
        await job_ctx.api.sip.transfer_sip_participant(
            api.TransferSIPParticipantRequest(
                room_name=job_ctx.room.name,
                participant_identity=participant_identity,
                transfer_to=f"tel:{transfer_to}",
            )
        )
        return "Call transferred successfully"
    except Exception as e:
        logger.error(f"Error transferring call: {str(e)}")
        return f"Could not transfer call: {str(e)}"

@dataclass
class UserData:
    """User data class that can be extended with dynamic fields"""
    agents: Dict[str, Agent] = field(default_factory=dict)
    prev_agent: Optional[Agent] = None
    conversation_attempts: Dict[str, int] = field(default_factory=dict)
    agent_config: Dict = field(default_factory=dict)  # Store the agent configuration

    def summarize(self) -> str:
        """Convert user data to a string representation"""
        data = {k: v for k, v in self.__dict__.items() if k not in ['agents', 'prev_agent', 'agent_config']}
        return json.dumps(data, indent=2, default=str)
    
    def increment_attempt(self, agent_name: str, max_attempts: int = 2) -> bool:
        """Increment conversation attempt counter and check if max attempts reached
        
        Returns:
            bool: True if max attempts reached, False otherwise
        """
        if agent_name not in self.conversation_attempts:
            self.conversation_attempts[agent_name] = 1
            return False
        
        self.conversation_attempts[agent_name] += 1
        return self.conversation_attempts[agent_name] >= max_attempts
    
    def reset_attempts(self, agent_name: str) -> None:
        """Reset the conversation attempt counter for the agent"""
        self.conversation_attempts[agent_name] = 0

RunContext_T = RunContext[UserData]


class BaseAgent(Agent):
    """Base agent class with common transfer logic"""
    
    async def on_enter(self) -> None:
        agent_name = self.__class__.__name__
        logger.info(f"entering task {agent_name}")

        userdata: UserData = self.session.userdata
        chat_ctx = self.chat_ctx.copy()

        # Add the previous agent's chat history to the current agent
        llm_model = self.llm or self.session.llm
        if isinstance(userdata.prev_agent, Agent) and not isinstance(llm_model, llm.RealtimeModel):
            truncated_chat_ctx = userdata.prev_agent.chat_ctx.copy(
                 exclude_function_call=False
            )
            existing_ids = {item.id for item in chat_ctx.items}
            items_copy = [item for item in truncated_chat_ctx.items if item.id not in existing_ids]
            chat_ctx.items.extend(items_copy)

        # Get agent configuration to access transfer_agents and end_call_logic
        agent_config = None
        for config_agent_name, config in userdata.agent_config.get("agents", {}).items():
            if config_agent_name == agent_name:
                agent_config = config
                break
        
        transfer_agents_text = ""
        end_call_logic = ""
        required_fields = []
        rag_instructions = ""
        
        if agent_config:
            # Get transfer_agents details
            transfer_agents = agent_config.get("transfer_agents", [])
            if transfer_agents:
                transfer_agents_text = "TRANSFER LOGIC - You can transfer to the following agents:\n"
                for agent_info in transfer_agents:
                    target_agent = agent_info.get("agent_name", "")
                    logic = agent_info.get("transfer_logic", "")
                    if target_agent and logic:
                        transfer_agents_text += f"- {target_agent}: {logic}\n"
            
            end_call_logic = agent_config.get("end_call_logic", "")
            
            # Identify required fields that need to be collected
            for field_config in agent_config.get("collects", []):
                if field_config.get("required", False):
                    field_name = field_config.get("name")
                    field_value = getattr(userdata, field_name, None)
                    if field_value is None:
                        required_fields.append(field_name)
                        
            # RAG-specific instructions if enabled
            rag_config = agent_config.get("rag_config", {})
            if rag_config.get("enabled", False):
                kb_description = rag_config.get("description", "")
                rag_instructions = f"""
KNOWLEDGE BASE ACCESS:
You have access to a knowledge base with the following description:
{kb_description}

When a user asks a question that might require specific information from the knowledge base:
1. First determine if the question is related to the knowledge domain described above
2. If yes, use the search_knowledge_base tool to retrieve relevant information
3. Include this information in your response, citing the source

For general questions outside this knowledge domain, use your general knowledge.
Strictly don't search for knowledge base more than 2 times strictly that is don't call the search_knowledge_base tool more than 2 times, after that whatever information you have just answer with the data you have retrived from the knowledge base.
"""

        # Add data collection instructions if there are required fields
        data_collection_instructions = ""
        if required_fields:
            data_collection_instructions = f"""IMPORTANT DATA COLLECTION REQUIREMENT:
You must collect the following required information before transferring or ending the call: {', '.join(required_fields)}

Only after all required data is collected should you consider transferring to another agent or ending the call.
Use the appropriate tools to collect and store this information.

"""

        # Add an instruction message including the user data, transfer_agents, and end_call_logic
        instructions = f"""You are {agent_name} agent. Current user data is {userdata.summarize()}

{data_collection_instructions}\n{rag_instructions}\n{transfer_agents_text}\n
END CALL LOGIC - Follow these instructions to determine when to end the call:\n
{end_call_logic}

IMPORTANT: When a user clearly indicates they are done, don't want any more help, 
or wants to end the call, use the hangup tool IMMEDIATELY. Don't ask for confirmation 
or continue the conversation. Just say a brief goodbye and hang up."""
        
        chat_ctx.add_message(
            role="assistant",
            content=instructions,
        )
        await self.update_chat_ctx(chat_ctx)
        self.session.generate_reply(tool_choice="none")

    async def update_tool_dynamically(self, field_name: str, description: str = None) -> None:
        """Dynamically add a new tool for a specific field during runtime"""
        async def set_input(input: str, context: RunContext_T) -> str:
            userdata = context.userdata
            setattr(userdata, field_name, input)
            return f"Field {field_name} was set to {input}"
            
        tool_name = f"set_{field_name}"
        description = description or f"Set the value for {field_name}"
        
        new_tool = function_tool(set_input, name=tool_name, description=description)
        
        # Update the agent's tools
        await self.update_tools(self.tools + [new_tool])

    async def search_knowledge_base(self, context: RunContext_T, query: str) -> str:
        """
        Search the knowledge base for relevant information based on the user's query.
        
        Args:
            query: The search query or question from the user
        
        Returns:
            Relevant information from the knowledge base
        """
        userdata = context.userdata
        agent_name = context.session.current_agent.__class__.__name__
        agent_config = None
        
        # Send a verbal status update to the user after a short delay
        async def _speak_status_update(delay: float = 0.5):
            await asyncio.sleep(delay)
            await context.session.generate_reply(instructions=f"""
                You are searching the knowledge base for \"{query}\" but it is taking a little while.
                Update the user on your progress, but be very brief.
            """)
        
        status_update_task = asyncio.create_task(_speak_status_update(0.5))
        
        # Find the agent configuration
        for config_agent_name, config in userdata.agent_config.get("agents", {}).items():
            if config_agent_name in agent_name.lower():
                agent_config = config
                break
        
        if not agent_config:
            status_update_task.cancel()
            return "Could not find agent configuration to access knowledge base"
        
        rag_config = agent_config.get("rag_config", {})
        if not rag_config.get("enabled", False):
            status_update_task.cancel()
            return "Knowledge base access is not enabled for this agent"
        
        # Replace placeholder variables with actual values
        user_id = rag_config.get("user_id", "").replace("{{user_id}}", getattr(userdata, "user_id", "default_user"))
        workflow_id = rag_config.get("workflow_id", "").replace("{{workflow_id}}", getattr(userdata, "workflow_id", "default_workflow"))
        agent_id = rag_config.get("agent_id", "")
        vector_db_config = rag_config.get("vector_db_config", {})
        collection_name = rag_config.get("collection_name", "")
        vector_db_type = rag_config.get("vector_db_type", "")
        tts_api_key = rag_config.get("tts_api_key", "")
        embedding_provider = rag_config.get("embedding_provider", "")
        embedding_model = rag_config.get("embedding_model", "")
        # Call the API to search the knowledge base
        result = await search_knowledge_base_api(user_id, workflow_id, agent_id, query,vector_db_config,collection_name,vector_db_type,tts_api_key,embedding_provider,embedding_model)
        
        # Cancel status update if search completed before timeout
        status_update_task.cancel()
        
        if "error" in result:
            return f"Error searching knowledge base: {result['error']}"
        
        # Format the search results
        results = result.get("results", [])
        if not results:
            return "No relevant information found in the knowledge base for this query."
        
        formatted_results = []
        for idx, item in enumerate(results, 1):
            content = item.get("content", "")
            source = item.get("source", "Unknown source")
            formatted_results.append(f"Result {idx} (from {source}):\n{content}\n")
        
        return "Here's what I found in our knowledge base:\n\n" + "\n".join(formatted_results)
    
    async def api_call(self, context: RunContext_T, query:str) -> str:
        """
        Make an API call to an external service with the provided parameters.
        
        Args:
            context: The run context
            api_url: The URL to call
            http_method: HTTP method (GET, POST, PUT, DELETE, PATCH)
            headers: Optional headers for the request
            authentication: Optional authentication parameters
            parameters: Optional query parameters
            request_body: Optional request body
        
        Returns:
            Response from the API call
        """
        import aiohttp
        
        userdata = context.userdata
        agent_name = context.session.current_agent.__class__.__name__
        agent_config = None

        try:
            if isinstance(query, str):
                query = json.loads(query)
        except:
            return {"error": "Invalid query format. Expected JSON object with 'api_name' field."}
        
        # Check if api_name is provided
        api_name = query.get("api_name")
        print(f"api_name: {api_name}")
        if not api_name:
            return {"error": "Missing 'api_name' in query. Please specify which API to call."}
        
        # Send a verbal status update to the user after a short delay
        async def _speak_status_update(delay: float = 0.5):
            await asyncio.sleep(delay)
            await context.session.generate_reply(instructions=f"""
                You are making an API call to {api_name} but it is taking a little while.
                Update the user on your progress, but be very brief.
            """)
        
        status_update_task = asyncio.create_task(_speak_status_update(0.5))
        
        # Find the agent configuration
        for config_agent_name, config in userdata.agent_config.get("agents", {}).items():
            if config_agent_name in agent_name.lower():
                agent_config = config
                break
        
        if not agent_config:
            status_update_task.cancel()
            return "Could not find agent configuration to make API call"
        
        api_configs = agent_config.get("api_call_configs", [])
        if not api_configs or not isinstance(api_configs, list):
            status_update_task.cancel()
            return {"error": "API call is not configured for this agent"}
        
        api_config = None
        for config in api_configs:
            if config.get("name") == api_name and config.get("enabled", False):
                api_config = config
                break
        
        if not api_config:
            status_update_task.cancel()
            return {"error": f"API '{api_name}' not found or not enabled for this agent"}
        
        api_url = api_config.get("base_url")
        print(f"api_url: {api_url}")
        http_method = api_config.get("allowed_methods", ["GET"])[0]
        print(f"http_method: {http_method}")
        print(f"http_method: {http_method}")  # Use first allowed method
        headers = api_config.get("default_headers", {}).copy()
        authentication = api_config.get("authentication", {})

        # Handle authentication
        auth = None
        if authentication:
            if authentication.get("type") == "basic":
                auth = aiohttp.BasicAuth(authentication.get("username", ""), authentication.get("password", ""))
            elif authentication.get("type") == "bearer":
                headers["Authorization"] = f"Bearer {authentication.get('token', '')}"
            elif authentication.get("type") == "api_key":
                headers[authentication.get("header_name", "x-api-key")] = authentication.get("api_key", "")
        
        # Prepare params and body
        params = query.get("parameters", {}) or {}
        json_body = query.get("body", {}) or None
        logger.info(f"params: {params}")
        logger.info(f"json_body: {json_body}")
        try:
            async with aiohttp.ClientSession() as session:
                req_args = dict(headers=headers, auth=auth)
                
                if http_method.upper() == "GET":
                    async with session.get(api_url, params=params, **req_args) as resp:
                        result = await resp.json()
                elif http_method.upper() == "POST":
                    async with session.post(api_url, params=params, json=json_body, **req_args) as resp:
                        result = await resp.json()
                elif http_method.upper() == "PUT":
                    async with session.put(api_url, params=params, json=json_body, **req_args) as resp:
                        result = await resp.json()
                elif http_method.upper() == "DELETE":
                    async with session.delete(api_url, params=params, json=json_body, **req_args) as resp:
                        result = await resp.json()
                elif http_method.upper() == "PATCH":
                    async with session.patch(api_url, params=params, json=json_body, **req_args) as resp:
                        result = await resp.json()
                else:
                    status_update_task.cancel()
                    return {"error": "Unsupported HTTP method"}
                
                # Cancel status update if API call completed before timeout
                status_update_task.cancel()
                print(result)
                return result
                
        except Exception as e:
            status_update_task.cancel()
            return {"error": f"Error making API call: {str(e)}"}

    async def _transfer_to_agent(self, name: str, context: RunContext_T) -> tuple[Agent, str]:
        userdata = context.userdata
        current_agent = context.session.current_agent
        next_agent = userdata.agents[name]
        userdata.prev_agent = current_agent
        
        # Reset conversation attempts for the new agent
        userdata.reset_attempts(name)

        return next_agent, f"Transferring to {name}."


class AgentBuilder:
    """Builder class that constructs agents based on configuration
    
    Configuration format:
    {
        "greeting": "Optional greeting message",
        "starting_agent": "greeter",
        "menu": "Optional menu text",
        "voices": {
            "male": "voice-id-1",
            "female": "voice-id-2",
            ...
        },
        "agents": {
            "agent_name": {
                "name": "Display Name",
                "description": "Agent instructions",
                "voice": "male/female/etc.",
                "collects": [
                    {"name": "field_name", "type": "text|number|list|boolean|payment", "required": true/false}
                ],
                "transfer_logic": "Logic for when to transfer to other agents",
                "end_call_logic": "Logic for when to end the call",
                
                // Optional message fields - if omitted, messages will be generated based on context
                "goodbye_message": "Custom goodbye message",
                "retry_message": "Custom retry message",
                "timeout_message": "Custom timeout message",
                "completion_message": "Message before hanging up after completion",
                
                // Call flow control options
                "hangup_after_completion": true/false,  // If true, call will end after data collection
                "transfer_after_completion": "agent_name"  // Agent to transfer to after completing data collection
            },
            ...
        }
    }
    
    If message fields are not provided, the system will generate appropriate messages
    based on the conversation context.
    """
    
    def __init__(self, config: dict):
        self.config = config
        print("config: ",self.config)
        print("config type: ",type(self.config))
        # Create UserData with dynamic fields
        self.userdata = UserData()
        self.userdata.agent_config = config  # Store the configuration in userdata
        
        # Initialize all possible fields from all agents
        self._initialize_all_fields()
    
    def _initialize_all_fields(self) -> None:
        """Initialize all fields from all agents' configuration"""
        for agent_name, agent_config in self.config.get("agents", {}).items():
            for field_config in agent_config.get("collects", []):
                field_name = field_config.get("name")
                field_type = field_config.get("type")
                
                if field_type in ["text", "list", "number"]:
                    setattr(self.userdata, field_name, None)
                elif field_type == "payment":
                    setattr(self.userdata, f"{field_name}_card", None)
                    setattr(self.userdata, f"{field_name}_expiry", None)
                    setattr(self.userdata, f"{field_name}_cvv", None)
                elif field_type == "boolean":
                    setattr(self.userdata, field_name, False)
    
    def _create_dynamic_tool(self, agent_name: str, field_config: dict) -> callable:
        """Create a dynamic tool based on field configuration using the closure pattern"""
        field_name = field_config.get("name")
        field_type = field_config.get("type")
        field_required = field_config.get("required", False)
        tool_name = f"{agent_name}_update_{field_name}"
        
        # Create a closure function that captures field_name and field_type
        def tool_function_factory():
            if field_type == "text":
                async def set_text(value: str, context: RunContext_T) -> str:
                    userdata = context.userdata
                    setattr(userdata, field_name, value)
                    return f"Updated {field_name} to {value}"
                return set_text
                
            elif field_type == "list":
                async def set_list(items_string: str, context: RunContext_T) -> str:
                    userdata = context.userdata
                    # Try to parse as JSON array first, then fall back to comma-separated
                    try:
                        items = json.loads(items_string)
                        if not isinstance(items, list):
                            # If it's not a list, treat it as a single item
                            items = [str(items)]
                    except (json.JSONDecodeError, TypeError):
                        # Fall back to comma-separated values
                        items = [item.strip() for item in items_string.split(',') if item.strip()]
                    
                    setattr(userdata, field_name, items)
                    return f"Updated {field_name} to {items}"
                return set_list
                
            elif field_type == "number":
                async def set_number(value: float, context: RunContext_T) -> str:
                    userdata = context.userdata
                    setattr(userdata, field_name, value)
                    return f"Updated {field_name} to {value}"
                return set_number
                
            elif field_type == "payment":
                async def set_payment(card_number: str, expiry: str, cvv: str, context: RunContext_T) -> str:
                    userdata = context.userdata
                    setattr(userdata, f"{field_name}_card", card_number)
                    setattr(userdata, f"{field_name}_expiry", expiry)
                    setattr(userdata, f"{field_name}_cvv", cvv)
                    return f"Updated payment information with card number {card_number}"
                return set_payment
                
            elif field_type == "boolean":
                async def set_boolean(value: bool, context: RunContext_T) -> str:
                    userdata = context.userdata
                    setattr(userdata, field_name, value)
                    return f"Updated {field_name} to {value}"
                return set_boolean
                
            else:
                raise ValueError(f"Unknown field type: {field_type}")
        
        # Get the function based on field type
        inner_func = tool_function_factory()
        
        # Create appropriate description based on field type
        required_text = " (required)" if field_required else ""
        if field_type == "text":
            description = f"Set the {field_name} as a text value{required_text}"
        elif field_type == "list":
            description = f"Set the {field_name} as a list of items (provide as JSON array like ['item1', 'item2'] or comma-separated like 'item1, item2'){required_text}"
        elif field_type == "number":
            description = f"Set the {field_name} as a numeric value{required_text}"
        elif field_type == "payment":
            description = f"Set the payment information for {field_name}{required_text}"
        elif field_type == "boolean":
            description = f"Set the {field_name} as a boolean value{required_text}"
        else:
            description = f"Set the value for {field_name}{required_text}"
        
        # Create and return the function tool
        return function_tool(inner_func, name=tool_name, description=description)

    def _create_completion_tool(self, agent_name: str) -> callable:
        """Create a tool to complete the agent's task and return to greeter"""
        tool_name = f"{agent_name}_complete_task"
        
        async def complete_task(context: RunContext_T) -> str:
            agent_config = self.config.get("agents", {}).get(agent_name, {})
            required_fields = []
            
            # Check that all required fields are filled
            for field_config in agent_config.get("collects", []):
                field_name = field_config.get("name")
                is_required = field_config.get("required", False)
                
                if is_required:
                    field_value = getattr(context.userdata, field_name, None)
                    if field_value is None:
                        required_fields.append(field_name)
                        
            if required_fields:
                return "Please complete the following information first: " + ", ".join(required_fields)
            
            # Reset the conversation attempts since we're successfully completing
            context.userdata.reset_attempts(agent_name)
            
            # Check if this agent should hang up after completion
            hangup_after_completion = agent_config.get("hangup_after_completion", False)
            if hangup_after_completion:
                # Let the LLM generate an appropriate completion message based on context
                # unless one is specifically provided in the config
                completion_message = agent_config.get("completion_message", None)
                if completion_message is None:
                    # Generate a default message
                    await context.session.generate_reply(
                        instructions="Thank the user for providing the information and let them know you'll be ending the call."
                    )
                else:
                    await context.session.generate_reply(instructions=completion_message)
                
                # Very short delay to ensure message is sent
                await asyncio.sleep(0.3)
                # Call hangup directly
                return await hangup_call(context)
            
            # Only transfer if we're not hanging up
            if agent_config.get("transfer_after_completion"):
                transfer_to = agent_config.get("transfer_after_completion")
                return await context.session.current_agent._transfer_to_agent(transfer_to, context)
            
            # Otherwise, let the AI decide what to do
            return await context.session.current_agent._transfer_to_agent(agent_config.get("transfer_after_completion", "greeter"), context)
        
        description = "Complete this task and determine next steps based on configuration and conversation context"
        return function_tool(complete_task, name=tool_name, description=description)
        
    def _create_hangup_tool(self, agent_name: str) -> callable:
        """Create a tool to hang up the call"""
        tool_name = f"{agent_name}_hangup"
        
        async def end_call(context: RunContext_T) -> str:
            # Check if there are any required fields that haven't been collected
            agent_config = self.config.get("agents", {}).get(agent_name, {})
            required_validations = []
            
            # Check that all required fields are filled before hanging up
            for field_config in agent_config.get("collects", []):
                field_name = field_config.get("name")
                is_required = field_config.get("required", False)
                
                if is_required:
                    field_value = getattr(context.userdata, field_name, None)
                    if field_value is None:
                        required_validations.append(field_name)
            
            # Only allow hanging up if required data is collected or if hanging up is forced
            # The "force" parameter isn't exposed to the LLM but is used internally
            force_hangup = getattr(context, "force_hangup", False)
            if required_validations and not force_hangup and not agent_config.get("hangup_after_completion", False):
                return f"Cannot end the call yet. You must first collect the following required information: {', '.join(required_validations)}"
            
            # Get any custom goodbye message from config
            goodbye_message = agent_config.get("goodbye_message", None)
            
            # Say goodbye and hang up immediately
            if goodbye_message:
                await context.session.generate_reply(instructions=goodbye_message)
            else:
                # Let the LLM generate an appropriate goodbye message based on context
                await context.session.generate_reply(
                    instructions="Say a brief, polite goodbye to the user."
                )
            
            # Very short delay to ensure message is sent
            await asyncio.sleep(0.3)
            
            # Immediate hangup
            return await hangup_call(context)
        
        description = "End the call immediately after saying goodbye"
        return function_tool(end_call, name=tool_name, description=description)

    def _create_transfer_tool(self, source_agent: str, target_agent: str) -> callable:
        """Create a tool to transfer from one agent to another"""
        tool_name = f"{source_agent}_to_{target_agent}"
        target_display_name = self.config.get("agents", {}).get(target_agent, {}).get("name", target_agent.capitalize())
        
        async def transfer(context: RunContext_T) -> tuple:
            current_agent_config = self.config.get("agents", {}).get(source_agent, {})
            required_validations = []
            
            # Check that all required fields are filled
            for field_config in current_agent_config.get("collects", []):
                field_name = field_config.get("name")
                is_required = field_config.get("required", False)
                
                if is_required:
                    field_value = getattr(context.userdata, field_name, None)
                    if field_value is None:
                        required_validations.append(field_name)
                        
            if required_validations:
                return f"Cannot transfer yet. You must first collect the following required information: {', '.join(required_validations)}"
            
            # Reset the conversation attempts since we're successfully transferring
            context.userdata.reset_attempts(source_agent)
                
            return await context.session.current_agent._transfer_to_agent(target_agent, context)
        
        description = f"Transfer the call to the {target_display_name}"
        return function_tool(transfer, name=tool_name, description=description)

    def build_agent(self, agent_name: str) -> Agent:
        agent_config = self.config.get("agents", {}).get(agent_name, {})
        if not agent_config:
            raise ValueError(f"Agent '{agent_name}' not found in configuration")
        
        display_name = agent_config.get("name", agent_name.capitalize())
        description = agent_config.get("description", "")
        collects = agent_config.get("collects", [])
        
        # Replace placeholders in description
        description = description.replace("{{menu}}", self.config.get("menu", ""))
        
        tools = []
        # Add data collection tools using the dynamic tool creation method
        for field_config in collects:
            tool = self._create_dynamic_tool(agent_name, field_config)
            tools.append(tool)
        
        # Add transfer tools for all agents except the current one
        for other_agent_name in self.config.get("agents", {}):
            if other_agent_name != agent_name:
                tools.append(self._create_transfer_tool(agent_name, other_agent_name))
        
        # Add hangup tool for all agents
        tools.append(self._create_hangup_tool(agent_name))

        # --- RAG TOOL INJECTION ---
        rag_config = agent_config.get("rag_config", {})
        if rag_config.get("enabled", False):
            async def search_knowledge_base_tool(query: str, context: RunContext_T) -> str:
                return await context.session.current_agent.search_knowledge_base(context, query)
            tools.append(function_tool(
                search_knowledge_base_tool,
                name="search_knowledge_base",
                description=(
                    "Use this tool to search the knowledge base for relevant information. "
                    "When a user asks a question that might be answered by the knowledge base, "
                    "use this tool to retrieve accurate and up-to-date information. "
                    "The knowledge base contains domain-specific information that should be used "
                    "to provide accurate responses to user queries."
                )
            ))
        # --- END RAG TOOL INJECTION ---

        # --- API CALL TOOL INJECTION ---
        api_call_config = agent_config.get("api_call_configs", {})
        for api_call in api_call_config:
            if api_call.get("enabled", False) == "True":
                async def api_call_tool(
                    query:str,
                    context: RunContext_T = None
                ) -> dict:
                    return await context.session.current_agent.api_call(
                        context,
                        query,
                    )
                logging.info(f"creating the api tool call: {api_call}")
                tools.append(function_tool(
                    api_call_tool,
                    name=api_call.get("name", "api_call_tool")+"_api_call_tool",
                    description=(
                        "Use this tool to make an API call to any external service. "
                        "Provide the API endpoint URL, HTTP method, headers, authentication, parameters, request body, and response schema as needed. "
                        "Use this tool whenever the user requests information or an action that requires calling an external API."
                    )
                ))
                parameters = api_call.get("parameters", {})
                body = api_call.get("body", {})
                description += f"\n\n{api_call.get('description', '')}"
                description += ("\n\nIMPORTANT: When a user asks for information or an action that requires calling an external API, "
                                f"you MUST use the {api_call.get('name', 'api_call_tool')}_api_call_tool BEFORE responding. Also pass the {api_call.get('name', 'api_call_tool')} in the query as a JSON object strictly, in this format {{\"api_name\": \"{api_call.get('name', 'api_call_tool')}\"}}"
)
                
                if parameters:
                    description += f"Make sure to pass the correct parameters to the api_call_tool in the query as a json object strictly\n\nParameters:"+"{'parameters': " + str(parameters) + "}"
                if body:
                    logging.info(f"Body: {body}")
                    description += f"Make sure to pass the correct body to the api_call_tool in the query as a json object strictly.\n\nBody:"+"'body':" + str(body) 
        # --- END API CALL TOOL INJECTION ---
        # Create the dynamic agent class
        class_name = f"Dynamic_{display_name.replace(' ', '')}"
        agent_class = type(class_name, (BaseAgent,), {})
        
        # Get TTS configuration
        tts_config = agent_config.get("tts", {})
        tts = None
        if tts_config:
            provider = tts_config.get("provider", "openai").lower()
            if provider == "openai":
                tts = openai.TTS(
                    api_key=tts_config.get("api_key", "not given"),
                    voice=tts_config.get("voice", "alloy")
                )
            elif provider == "cartesia":
                tts = cartesia.TTS(
                    api_key=tts_config.get("api_key", "not given"),
                    voice=tts_config.get("voice", "default"),
                    model="sonic-2"
                )
            elif provider == "kokoru":
                tts = openai.TTS(
                    base_url=tts_config.get("base_url", "http://localhost:8880/v1"),
                    model=tts_config.get("model", "kokoro"),
                    api_key=tts_config.get("api_key", "not given"),
                    voice=tts_config.get("voice", "af_sky"),
                    response_format=tts_config.get("response_format", "wav")
                )
            elif provider == "groq":
                tts = groq.TTS(
                    api_key=tts_config.get("api_key", "not given"),
                    voice=tts_config.get("voice", "Fritz-PlayAI"),
                    model=tts_config.get("model", "playai-tts")
                )
            elif provider == "elevenlabs":
                tts=elevenlabs.TTS(
                    voice_id=tts_config.get("voice_id", "ODq5zmih8GrVes37Dizd"),
                    model=tts_config.get("model", "eleven_multilingual_v2"),
                    api_key=tts_config.get("api_key", "not given")
                    )
        llm_config = agent_config.get("llm", {})
        llm = None
        if llm_config:
            provider = llm_config.get("provider", "openai").lower()
            if provider == "openai":
                llm = openai.LLM(
                    api_key=llm_config.get("api_key", "not given"),
                    model=llm_config.get("model", "gpt-4o")
                )
            elif provider == "openai-realtime":
                llm = openai.realtime.RealtimeModel(api_key=llm_config.get("api_key", "not given"),model=llm_config.get("model", "gpt-4o-realtime-preview"),voice=llm_config.get("voice", "alloy"),turn_detection=TurnDetection(
                    type="server_vad",
                    threshold=0.5,
                    prefix_padding_ms=300,
                    silence_duration_ms=300,
                    create_response=True,
                    interrupt_response=True,
                ))
                tts = None
            elif provider == "anthropic":
                logging.info(f"Anthropic API Key: {llm_config.get('api_key', 'not given')}")
                llm=anthropic.LLM(
                    api_key=llm_config.get("api_key", "not given"),
                    model=llm_config.get("model", "claude-3-5-sonnet-20241022")
                )
                logging.info(f"Anthropic LLM: {llm.label}")
            elif provider == "groq":
                llm=groq.LLM(
                    api_key=llm_config.get("api_key", "not given"),
                    model=llm_config.get("model", "llama-3.3-70b-versatile")
                )
                logging.info(f"Groq LLM: {llm.label}")
            # Strongly instruct the LLM to use the RAG tool for any relevant question
        if rag_config.get("enabled", False):
            description += ("\n\nIMPORTANT: When a user asks a question that might be answered by the knowledge base, "
                            "you MUST use the search_knowledge_base tool BEFORE responding. "
                            "The knowledge base contains domain-specific information that should be used "
                            "to provide accurate responses to user queries.")
        logging.info(f"Agent Instructions prompt : {description}")
        # logging.info(f"Agent Tools: {tools}")
        # if tts:
        #     logging.info(f"Agent TTS: {tts.label}")
        # if llm:
        #     logging.info(f"Agent LLM: {llm.label}")
        if llm_config.get("provider", "openai").lower() == "openai-realtime":
            agent = agent_class(
                instructions=description,
                tools=tools,
                tts=tts,
                llm=llm,
                stt=None
            )
            return agent
        agent = agent_class(
                instructions=description,
                tools=tools,
                tts=tts,
                llm=llm,
                stt=None
            )
        return agent
    
    def build_all_agents(self) -> Dict[str, Agent]:
        """Build all agents defined in the configuration"""
        agents = {}
        for agent_name in self.config.get("agents", {}):
            agent = self.build_agent(agent_name)
            agents[agent_name] = agent
        return agents
    
    def get_entry_agent(self) -> str:
        """Get the name of the entry agent"""
        return self.config.get("starting_agent", "greeter")
    
    def get_greeting(self) -> Optional[str]:
        """Get the greeting message"""
        return self.config.get("greeting")


async def entrypoint(ctx: JobContext):
    await ctx.connect()
    
    logging.info(f"ctx.job.metadata: {ctx.job.metadata}")
    logging.info(f"ctx.job.metadata type: {type(ctx.job.metadata)}")
    dial_info = json.loads(ctx.job.metadata)
    logging.info(f"dial_info: {dial_info}")
    phone_number = dial_info["phone_number"]
    sip_trunk_id = dial_info["sip_trunk_id"]
    agentic_workflow = dial_info["agentic_workflow"]
    # phone_number = phone_number
    print("phone_number: ",phone_number)
    # The participant's identity can be anything you want, but this example uses the phone number itself
    sip_participant_identity = phone_number
    if agentic_workflow["call_type"] == "runworkflow":
        print("workflow test triggered...")
        builder = AgentBuilder(agentic_workflow)
        print("building workflow to test: ",builder)
        # Create all agents
        agents = builder.build_all_agents()
        print("Creating all agents: ",agents)
        # Create userdata and store agents
        userdata = builder.userdata
        userdata.agents = agents
        
        # Initialize conversation attempts for all agents to 0
        entry_agent_name = builder.get_entry_agent()
        print("entry_agent_name: ",entry_agent_name)
        for agent_name in agentic_workflow.get("agents", {}):
            userdata.conversation_attempts[agent_name] = 0
        
        # Create agent session
        agent_session = AgentSession[UserData](
            userdata=userdata,
            stt=deepgram.STT(),
            llm=None,# llm will be set by each agent from its configuration 
            tts=None,  # TTS will be set by each agent from its configuration
            turn_detection="vad",
            vad=silero.VAD.load(),
            min_interruption_duration=0.1
        )
        print("agent_session: ",agent_session)
        # Get entry agent
        entry_agent = agents.get(entry_agent_name)
        if not entry_agent:
            raise ValueError(f"Entry agent '{entry_agent_name}' not found")
        
        # Start the session
        await agent_session.start(
            agent=entry_agent,
            room=ctx.room,
            room_input_options=RoomInputOptions(noise_cancellation=noise_cancellation.BVC())
        )


    if agentic_workflow["call_type"] == "outbound":
        if phone_number is not None:
            # The outbound call will be placed after this method is executed
            try:
            
                await ctx.api.sip.create_sip_participant(api.CreateSIPParticipantRequest(
                    # This ensures the participant joins the correct room
                    room_name=ctx.room.name,

                    # This is the outbound trunk ID to use (i.e. which phone number the call will come from)
                    # You can get this from LiveKit CLI with `lk sip outbound list`
                    sip_trunk_id=sip_trunk_id,

                    # The outbound phone number to dial and identity to use
                    sip_call_to=phone_number,
                    participant_identity=sip_participant_identity,

                    # This will wait until the call is answered before returning
                    wait_until_answered=True
                ))
                logging.info("call picked up successfully")
                print("call picked up successfully")
                builder = AgentBuilder(agentic_workflow)
    
                # Create all agents
                agents = builder.build_all_agents()
                
                # Create userdata and store agents
                userdata = builder.userdata
                userdata.agents = agents
                
                # Initialize conversation attempts for all agents to 0
                entry_agent_name = builder.get_entry_agent()
                for agent_name in agentic_workflow.get("agents", {}):
                    userdata.conversation_attempts[agent_name] = 0
                
                # Create agent session
                agent_session = AgentSession[UserData](
                    userdata=userdata,
                    stt=deepgram.STT(),
                    llm=None,
                    tts=None,  # TTS will be set by each agent from its configuration\
                    turn_detection="vad",
                    vad=silero.VAD.load(),
                    min_interruption_duration=0.1
                )
                
                # Get entry agent
                entry_agent = agents.get(entry_agent_name)
                
                if not entry_agent:
                    raise ValueError(f"Entry agent '{entry_agent_name}' not found")
                
                # Start the session
                await agent_session.start(
                    agent=entry_agent,
                    room=ctx.room,
                    room_input_options=RoomInputOptions(noise_cancellation=noise_cancellation.BVC())
                )
            except api.TwirpError as e:
                print(f"error creating SIP participant: {e.message}, "
                    f"SIP status: {e.metadata.get('sip_status_code')} "
                    f"{e.metadata.get('sip_status')}")
                ctx.shutdown()


    if agentic_workflow["call_type"] == "inbound":
        logging.info("Inbound call detected, starting session...")
        builder = AgentBuilder(agentic_workflow)
    
        # Create all agents
        agents = builder.build_all_agents()
        
        # Create userdata and store agents
        userdata = builder.userdata
        userdata.agents = agents
        
        # Initialize conversation attempts for all agents to 0
        entry_agent_name = builder.get_entry_agent()
        for agent_name in agentic_workflow.get("agents", {}):
            userdata.conversation_attempts[agent_name] = 0
        
        # Create agent session
        agent_session = AgentSession[UserData](
            userdata=userdata,
            stt=deepgram.STT(),
            llm=openai.LLM(),
            tts=None,  # TTS will be set by each agent from its configuration
            turn_detection="vad",
            vad=silero.VAD.load(),
            min_interruption_duration=0.1
        )
        
        # Get entry agent
        entry_agent = agents.get(entry_agent_name)
        
        if not entry_agent:
            raise ValueError(f"Entry agent '{entry_agent_name}' not found")
        
        # Start the session
        await agent_session.start(
            agent=entry_agent,
            room=ctx.room,
            room_input_options=RoomInputOptions(noise_cancellation=noise_cancellation.BVC())
        )
    


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint,agent_name="utter-telephony-agent"))