from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from database.db_models import CallAgent
from schemas.call_agent import CallAgentCreate, CallAgentUpdate
from database.db_init import Database
from database.db_models import (
    Workflow,
    WorkflowNode,
    NodeType,
    WorkflowEdge,
    TTSUserData,
    LLMUserData,
    RAGFileUpload,
    RAGVectorDB
)
from livekit import api
import json
import logging
import os
import random
import asyncio
from livekit.protocol.sip import (
    CreateSIPOutboundTrunkRequest, SIPOutboundTrunkInfo,CreateSIPOutboundTrunkRequest,ListSIPOutboundTrunkRequest,ListSIPInboundTrunkRequest
)
from common.config import Configuration
from providers.manager import ProviderManager
class CallAgentManager:
    def __init__(self,config: Configuration, db_session: Session,provider_manager: ProviderManager):
        self.db = db_session
        self.config = config.configuration()
        self.provider_manager = provider_manager
    def get_by_id(self, call_agent_id: str,user_id:str,organization_id:str) -> Optional[CallAgent]:
        """Get a call agent by ID."""
        return self.db.query(CallAgent).options(joinedload(CallAgent.workflow)).filter(CallAgent.id == call_agent_id,CallAgent.user_id == user_id,CallAgent.organization_id == organization_id).first()


    def get_by_user_id(self, user_id: str,organization_id:str, skip: int = 0, limit: int = 100) -> List[CallAgent]:
        """Get call agents for a user."""
        return self.db.query(CallAgent) \
            .options(joinedload(CallAgent.workflow)) \
            .filter(CallAgent.user_id == user_id,CallAgent.organization_id == organization_id) \
            .order_by(CallAgent.created_at.desc()) \
            .offset(skip) \
            .limit(limit) \
            .all()


    async def create(self, user_id: str,organization_id:str, obj_in: CallAgentCreate) -> CallAgent:
        """Create a new call agent."""
        db_obj = CallAgent(
            user_id=user_id,
            organization_id=organization_id,
            workflow_id=obj_in.workflow_id,
            call_type=obj_in.call_type,
            phone_numbers=obj_in.phone_numbers,
            status="pending"
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        
        # workflow_json = await generate_workflow_json_from_db(db, workflow_id=obj_in.workflow_id)
        # Load the workflow relationship explicitly
        self.db.refresh(db_obj, ['workflow'])
        return db_obj


    def update(self, db_obj: CallAgent, obj_in: CallAgentUpdate,user_id:str,organization_id:str) -> CallAgent:
        """Update a call agent."""
        update_data = obj_in.model_dump(exclude_unset=True)
        update_data["user_id"] = user_id
        update_data["organization_id"] = organization_id
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        
        # Load the workflow relationship explicitly
        self.db.refresh(db_obj, ['workflow'])
        return db_obj


    def delete(self, call_agent_id: str,user_id:str,organization_id:str) -> None:
        """Delete a call agent."""
        db_obj = self.db.query(CallAgent).filter(CallAgent.id == call_agent_id,CallAgent.user_id == user_id,CallAgent.organization_id == organization_id).first()
        if db_obj:
            self.db.delete(db_obj)
            self.db.commit()


    def get_livekit_api(self):
        return api.LiveKitAPI(
            url=self.config.livekit_configuration.url,
            api_key=self.config.livekit_configuration.api_key,
            api_secret=self.config.livekit_configuration.api_secret
        )


    async def create_dispatch(self,phone_numbers: List[str], agent_name: str, sip_trunk_id: str, agentic_workflow: dict, call_type: str):
        """
        Create dispatch requests for multiple phone numbers asynchronously.
        
        Args:
            phone_numbers: List of phone numbers to call
            agent_name: Name of the agent to handle the calls
            sip_trunk_id: SIP trunk identifier
            agentic_workflow: Workflow configuration for the agent
        """
        lkapi = self.get_livekit_api()
        agentic_workflow["call_type"] = call_type
        agentic_workflow_str = json.dumps(agentic_workflow)
        logging.info(f"Phone numbers to call: {phone_numbers}")
        
        # Create a list to store all dispatch tasks
        dispatch_tasks = []
        
        # Create a dispatch task for each phone number
        for phone_number in phone_numbers:
            # Generate a unique room name for each call
            room_name = f"outbound-{''.join(str(random.randint(0, 9)) for _ in range(10))}"
            
            # Create metadata for this specific call
            metadata = f'{{"phone_number": "{phone_number}" , "sip_trunk_id": "{sip_trunk_id}" , "agentic_workflow": {agentic_workflow_str}}}'
            
            # Create dispatch request task
            dispatch_task = lkapi.agent_dispatch.create_dispatch(
                api.CreateAgentDispatchRequest(
                    agent_name=agent_name,
                    room=room_name,
                    metadata=metadata
                )
            )
            
            # Add task to list
            dispatch_tasks.append(dispatch_task)
        
        # Wait for all dispatch tasks to complete
        if dispatch_tasks:
            results = await asyncio.gather(*dispatch_tasks, return_exceptions=True)
            
            # Log results
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logging.error(f"Failed to create dispatch for {phone_numbers[i]}: {str(result)}")
                else:
                    logging.info(f"Successfully created dispatch for {phone_numbers[i]}")
        
        # Close the API connection
        await lkapi.aclose()


    async def setup_dispatch_rule(self,agent_name:str,metadata:str = "job dispatch metadata"):
        print(f"Setting up dispatch rule for agent print meta data: {metadata}")
        lkapi = self.get_livekit_api()
        try:
            # Check for existing rules first to avoid duplicates
            try:
                existing_rules = await lkapi.sip.list_sip_dispatch_rule(api.ListSIPDispatchRuleRequest())
                print("existing_rules.items[0].sip_dispatch_rule_id",existing_rules.items[0].sip_dispatch_rule_id)
                await lkapi.sip.delete_sip_dispatch_rule(api.DeleteSIPDispatchRuleRequest(
                    sip_dispatch_rule_id=existing_rules.items[0].sip_dispatch_rule_id
                ))

                # Check if a rule with the desired configuration already exists
                print(f"Existing rules: {existing_rules.items}")
                print(f"Existing rules length: {type(existing_rules)}")
                print("Deleted existing dispatch rule")
                # if len(existing_rules.items) == 1:
                #     print("Using existing dispatch rule")
                #     return existing_rules.items[0]
                # else:
                #     for rule in existing_rules.items:
                #         if hasattr(rule, 'dispatch_rule_individual') and rule.dispatch_rule_individual.room_prefix == "call-":
                #             print("Using existing dispatch rule")
                #             return rule
            except Exception as e:
                print(f"Error deleting existing dispatch rules: {str(e)}")
                # Continue to create a new rule
            print("Creating new dispatch rule")
            request = api.CreateSIPDispatchRuleRequest(
                rule=api.SIPDispatchRule(
                    dispatch_rule_individual=api.SIPDispatchRuleIndividual(
                        room_prefix="call-",
                    )
                ),
                room_config=api.RoomConfiguration(
                    agents=[api.RoomAgentDispatch(
                        agent_name=agent_name,
                        metadata=metadata,
                    )]
                )
            )
            dispatch = await lkapi.sip.create_sip_dispatch_rule(request)
            print("Created new dispatch rule:", dispatch)
            return dispatch
        except Exception as e:
            print(f"Error in setup_dispatch_rule: {str(e)}")
            return None
        finally:
            await lkapi.aclose()


    async def setup_inbound_trunk(self):
        lkapi = self.get_livekit_api()
        try:
            # Check for existing trunks first
            try:
                existing_trunks = await lkapi.sip.list_sip_inbound_trunk(ListSIPInboundTrunkRequest())
                # Check if a trunk with the desired configuration already exists
                for trunk in existing_trunks.items:
                    if any(number == os.getenv("OUTBOUND_CALL_NUMBERS") for number in trunk.numbers):
                    #   print("Using existing inbound trunk")
                        print("trunk.sip_inbound_trunk_id",trunk.sip_trunk_id)
                        await lkapi.sip.delete_sip_trunk(api.DeleteSIPTrunkRequest(
                            sip_trunk_id=trunk.sip_trunk_id
                        ))
                        print("Deleted existing inbound trunk")
            except Exception as e:
                
            # Continue to create a new trunk

                trunk = api.SIPInboundTrunkInfo(
                name = os.getenv("OUTBOUND_CALL_NAME"),
                numbers = [os.getenv("OUTBOUND_CALL_NUMBERS")],
                # auth_username = os.getenv("OUTBOUND_CALL_AUTH_USERNAME"),
                # auth_password = os.getenv("OUTBOUND_CALL_AUTH_PASSWORD"),
                # allowed_addresses=[os.getenv("OUTBOUND_CALL_ADDRESS")],
                # allowed_numbers=[allowed_numbers]
                )

                request = api.CreateSIPInboundTrunkRequest(
                trunk = trunk
                )

                trunk = await lkapi.sip.create_sip_inbound_trunk(request)
                print("Created new inbound trunk:", trunk)

                return trunk
            
        except Exception as e:
            print(f"Error in setup_inbound_trunk: {str(e)}")
            return None
            
        finally:
            await lkapi.aclose()


    async def setup_outbound_trunk(self):
    #   livekit_api = get_livekit_api()
        lkapi = self.get_livekit_api()
        try:
            # Check for existing trunks first
            try:
                existing_trunks = await lkapi.sip.list_sip_outbound_trunk(ListSIPOutboundTrunkRequest())
                # Check if a trunk with the desired configuration already exists
                for trunk in existing_trunks.items:
                    if any(number == os.getenv("OUTBOUND_CALL_NUMBERS") for number in trunk.numbers):
                        print("Using existing outbound trunk")
                        return trunk
            except Exception as e:
                print(f"Error checking existing outbound trunks: {str(e)}")
                # Continue to create a new trunk

                trunk = SIPOutboundTrunkInfo(
                name = os.getenv("OUTBOUND_CALL_NAME"),
                address = os.getenv("OUTBOUND_CALL_ADDRESS"),
                numbers = [os.getenv("OUTBOUND_CALL_NUMBERS")],
                auth_username = os.getenv("OUTBOUND_CALL_AUTH_USERNAME"),
                auth_password = os.getenv("OUTBOUND_CALL_AUTH_PASSWORD")
                )

                request = CreateSIPOutboundTrunkRequest(
                trunk = trunk
                )

                trunk = await lkapi.sip.create_sip_outbound_trunk(request)
                print("Created new outbound trunk:", trunk)
                return trunk
            
        except Exception as e:
            print(f"Error in setup_outbound_trunk: {str(e)}")
            return None
            
        finally:
            await lkapi.aclose()

    async def process_call(self,call_data, workflow_json):
        """Process a call request"""
        # Create LiveKit API client
        livekit_api = self.get_livekit_api()
        
        try:
            # Set up the required infrastructure
            # dispatch_rule_response = await setup_dispatch_rule("omkar-telephony-agent")
            # if not dispatch_rule_response:
            #     print(f"Failed to set up dispatch rule for call {call_id}")
            #     return
                
            if call_data.call_type == "outbound":
                # dispatch_rule_response = await setup_dispatch_rule("omkar-telephony-agent")
                outbound_trunk_response = await self.setup_outbound_trunk()
                # print("outbound_trunk_response",outbound_trunk_response)
                if not outbound_trunk_response:
                    print(f"Failed to set up outbound trunk for call {call_data.workflow_id}")
                    return
                # Generate a random room name for this call
                await self.create_dispatch(call_data.phone_numbers, "utter-telephony-agent",outbound_trunk_response.sip_trunk_id,workflow_json,"outbound")
                logging.info(f"Outbound call created for {call_data.phone_numbers}")

            elif call_data.call_type == "inbound":
                inbound_trunk_response = await self.setup_inbound_trunk()
                agentic_workflow = workflow_json
                agentic_workflow['call_type'] = 'inbound'
                agentic_workflow_str = json.dumps(agentic_workflow)
                metadata = f'{{"phone_number": "" , "sip_trunk_id": "{inbound_trunk_response.sip_trunk_id}" , "agentic_workflow": {agentic_workflow_str}}}'
                print(f"Setting up dispatch rule for agent print meta data: {metadata}")
                dispatch_rule_response = await self.setup_dispatch_rule("utter-telephony-agent",metadata)
                print(f"Dispatch rule response: {dispatch_rule_response}")
                if not inbound_trunk_response:
                    print(f"Failed to set up inbound trunk for call {call_data.workflow_id}")
                    return
                # await create_dispatch(call_data.phone_number, "omkar-telephony-agent",inbound_trunk_response.sip_trunk_id,call_data.agentic_workflow,"inbound")
                
            else:
                # For inbound calls, we just need to ensure a dispatch rule exists
                # The actual call handling is done by LiveKit when the call comes in
                trunk_id = outbound_trunk_response["id"] if isinstance(outbound_trunk_response, dict) else outbound_trunk_response.id
                print(f"Inbound call {call_data.workflow_id} ready to be received on trunk {trunk_id}")
        
        except Exception as e:
            print(f"Error processing call {call_data.workflow_id}: {str(e)}")
        
        finally:
            # Always close the API client to avoid resource leaks
            await livekit_api.aclose()


    async def generate_workflow_json_from_db(self,db: Session, workflow_id: str,user_id:str,organization_id:str) -> Dict[str, Any]:
        """
        Generate workflow JSON directly from database tables.
        This is a more reliable approach that uses the actual database state instead of frontend state.
        
        Args:
            db: SQLAlchemy database session
            workflow_id: UUID of the workflow
            
        Returns:
            JSON structure for the workflow ready to be used by the multi-agent framework
        """
        # Get the workflow with all its nodes and edges
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id,Workflow.user_id == user_id,Workflow.organization_id == organization_id).first()
        if not workflow:
            raise ValueError(f"Workflow with ID {workflow_id} not found")
        
        # Get all nodes for this workflow with agent data
        nodes = db.query(WorkflowNode).options(
            joinedload(WorkflowNode.agent)
        ).filter(WorkflowNode.workflow_id == workflow_id,WorkflowNode.user_id == user_id,WorkflowNode.organization_id == organization_id).all()
        
        # Get all edges for this workflow
        edges = db.query(WorkflowEdge).filter(WorkflowEdge.workflow_id == workflow_id,WorkflowEdge.user_id == user_id,WorkflowEdge.organization_id == organization_id).all()
        
        # Find the start node
        start_node = next((n for n in nodes if n.node_type == NodeType.START), None)
        if not start_node:
            raise ValueError("No START node found in workflow")
        
        # Find agent nodes and create a mapping for key names
        agent_nodes = [n for n in nodes if n.node_type == NodeType.AGENT]
        agent_node_id_to_key = {}
        agent_config = {}
        
        # Process agent nodes to generate key names first (needed for lookups)
        for node in agent_nodes:
            if not node.agent:
                continue  # Skip nodes without agent data
            
            # Generate a consistent key name from agent name - remove all spaces
            key_name = node.agent.name.lower().replace(" ", "")
            agent_node_id_to_key[str(node.id)] = key_name
        
        # Find edges starting from the START node to determine starting agent
        start_edges = [e for e in edges if str(e.source_node_id) == str(start_node.id)]
        starting_agent = None
        
        if start_edges:
            # Get the target node of the first edge (the entry agent)
            start_target_id = str(start_edges[0].target_node_id)
            
            # Look up the key name for this node ID
            starting_agent = agent_node_id_to_key.get(start_target_id)
        
        # Now process agent nodes to build full configuration
        for node in agent_nodes:
            if not node.agent:
                continue  # Skip nodes without agent data
            
            # Get the key name for this agent node
            key_name = agent_node_id_to_key[str(node.id)]
            
            # Find all outgoing edges from this agent to other agents
            outgoing_edges = [e for e in edges if str(e.source_node_id) == str(node.id)]
            
            # Process transfer agents
            transfer_agents = []
            for edge in outgoing_edges:
                target_node = next((n for n in nodes if str(n.id) == str(edge.target_node_id)), None)
                
                if target_node and target_node.node_type == NodeType.AGENT:
                    target_key = agent_node_id_to_key.get(str(target_node.id))
                    
                    if target_key:
                        # Check if condition has name "AI Condition"
                        condition_description = ""
                        if edge.condition and 'name' in edge.condition and edge.condition['name'] == 'AI Condition':
                            condition_description = edge.condition.get('description', '')
                        
                        transfer_agents.append({
                            "agent_name": target_key,
                            "transfer_logic": condition_description
                        })
            
            # Process end call logic
            end_call_logic = ""
            end_edges = [e for e in outgoing_edges if 
                        any(n.node_type == NodeType.END for n in nodes if str(n.id) == str(e.target_node_id))]
            
            if end_edges and end_edges[0].condition and 'name' in end_edges[0].condition and end_edges[0].condition['name'] == 'AI Condition':
                end_call_logic = end_edges[0].condition.get('description', '')
            else:
                end_call_logic = "End the call if the user explicitly asks to hang up, says goodbye, or indicates they no longer need assistance."
            
            # Process LLM configuration
            llm_config = {
                "provider": "openai",
                "api_key": "",
                "model": "gpt-4o"
            }
            
            is_openai_realtime = False
            if node.agent.llm_provider_id:
                # Check if this is OpenAI Realtime
                if node.agent.llm_model == "openai-realtime":
                    is_openai_realtime = True
                    
                    # For OpenAI Realtime, get the LLM provider data (should be OpenAI)
                    llm_user_data = db.query(LLMUserData).filter(
                        LLMUserData.user_id == node.agent.user_id,
                        LLMUserData.provider_name == "openai",
                        LLMUserData.organization_id == organization_id
                    ).first()
                    
                    voice = ""
                    if node.agent.llm_config and "voice" in node.agent.llm_config:
                        voice = node.agent.llm_config["voice"]
                    
                    if llm_user_data:
                        # Get decrypted API key
                        llm_api_key = self.provider_manager.get_decrypted_llm_api_key(llm_user_data)
                        llm_config = {
                            "provider": "openai-realtime",
                            "api_key": llm_api_key,
                            "voice": voice
                        }
                else:
                    # Regular LLM provider
                    llm_provider_name = ""
                    llm_model_name = node.agent.llm_model or "gpt-4o"
                    
                    # Try to get provider name
                    if node.agent.llm_config and "provider" in node.agent.llm_config:
                        llm_provider_name = node.agent.llm_config["provider"]
                    else:
                        # Query for the provider name based on provider_id
                        llm_user_data = db.query(LLMUserData).filter(
                            LLMUserData.id == node.agent.llm_provider_id,
                            LLMUserData.organization_id == organization_id,
                            LLMUserData.user_id == user_id
                        ).first()
                        
                        if llm_user_data:
                            llm_provider_name = llm_user_data.provider_name
                    
                    # Get LLM user data for API key
                    llm_user_data = db.query(LLMUserData).filter(
                        LLMUserData.user_id == node.agent.user_id,
                        LLMUserData.provider_name == llm_provider_name,
                        LLMUserData.organization_id == organization_id
                    ).first()
                    
                    if llm_user_data:
                        # Get decrypted API key
                        llm_api_key = self.provider_manager.get_decrypted_llm_api_key(llm_user_data)
                        llm_config = {
                            "provider": llm_provider_name,
                            "api_key": llm_api_key,
                            "model": llm_model_name
                        }
            
            # Process TTS configuration - skip for OpenAI Realtime
            tts_config = None
            if not is_openai_realtime:
                tts_config = {
                    "provider": "openai",
                    "api_key": "",
                    "voice": "alloy"
                }
                
                if node.agent.tts_provider_id:
                    # Try to get TTS provider data for this agent
                    tts_user_data = db.query(TTSUserData).filter(
                        TTSUserData.user_id == node.agent.user_id,
                        # TTSUserData.provider_name == node.agent.tts_config.get('provider', 'openai') if node.agent.tts_config else 'openai',
                        TTSUserData.organization_id == organization_id
                    ).first()
                    
                    if tts_user_data:
                        # Get decrypted API key
                        tts_api_key = self.provider_manager.get_decrypted_tts_api_key(tts_user_data)
                        tts_config = {
                            "provider": tts_user_data.provider_name,
                            "api_key": tts_api_key,
                            "voice": node.agent.voice_id
                        }
                        logging.info(f"tts_config: {tts_config}")
                        # Add additional fields if applicable
                        if tts_user_data.provider_name == 'kokoro' and tts_user_data.base_url:
                            tts_config["base_url"] = tts_user_data.base_url
                            tts_config["response_format"] = tts_user_data.response_format
            
            # Process RAG configuration
            rag_config = None
            logging.info(f"Processing RAG config for agent {node.agent.name}")
            if node.agent.rag_config and len(node.agent.rag_config) > 0:
                for rag_conf in node.agent.rag_config:
                    logging.info(f"Found RAG config: {rag_conf}")
                    # Get all files for this collection
                    files = db.query(RAGFileUpload).filter(
                        RAGFileUpload.vector_db_id == rag_conf['id'],
                        RAGFileUpload.user_id == user_id,
                        RAGFileUpload.organization_id == organization_id,
                        RAGFileUpload.index_name == rag_conf['collection_name'],
                        RAGFileUpload.status == 'completed'  # Only include successfully processed files
                    ).all()
                    files = files[0]
                    logging.info(f"files: {files}")
                    if files:
                        # Combine descriptions and get metadata
                        combined_description = files.description
                        # file_count = len(files)
                        
                        # Use the most common embedding model from the files
                        embedding_model = files.embedding_model
                        embedding_provider = files.embedding_provider
                        vector_db = db.query(RAGVectorDB).filter(RAGVectorDB.id == rag_conf['id']).first()
                        vector_db_config = vector_db.config
                        vector_db_type = vector_db.db_type
                        rag_config = {
                            "enabled": True,
                            "knowledge_base_id": str(rag_conf['id']),
                            "collection_name": rag_conf['collection_name'],
                            "user_id":str(user_id),
                            "workflow_id": str(workflow_id),
                            "agent_id": str(node.id),
                            "description": combined_description or rag_conf.get('description', ''),
                            "embedding_model": embedding_model,
                            "embedding_provider": embedding_provider,
                            "vector_db_config": vector_db_config,
                            "vector_db_type": vector_db_type,

                        }
                        logging.info(f"Created RAG config: {rag_config}")
                        break  # Use the first valid RAG configuration
                    else:
                        logging.info(f"No completed files found for collection {rag_conf['collection_name']}")
            else:
                logging.info("No RAG config found for this agent")
            
            # Process API call configuration
            api_call_configs = []  # Changed to array to store multiple configs
            agent_tools = node.agent.tools if hasattr(node.agent, 'tools') and node.agent.tools else []
            
            if agent_tools and len(agent_tools) > 0:
                for tool in agent_tools:  # Process all tools instead of just the first one
                    # Remove spaces from tool name
                    tool_name = tool.name.replace(" ", "") if hasattr(tool, 'name') and tool.name else f"tool_{key_name}"
                    
                    tool_config = {
                        "enabled": "True",
                        "name": tool_name,  # Use the space-free name
                        "base_url": tool.endpoint_url or f"https://api.{key_name}.example.com",
                        "default_headers": {
                            "Content-Type": "application/json"
                        },
                        "allowed_methods": [tool.method] if hasattr(tool, 'method') else ["GET", "POST"],
                        "description": tool.description or f"This API call is used by the {node.agent.name} agent."
                    }
                    
                    # Add authentication if available
                    if tool.auth_type:
                        auth_config = {}
                        if tool.auth_type == "api_key":
                            auth_config = tool.auth_config
                        elif tool.auth_type == "bearer":
                            auth_config = tool.auth_config
                        elif tool.auth_type == "basic":
                            auth_config = tool.auth_config
                        
                        tool_config["authentication"] = auth_config
                    
                    # Add parameters and body (simplified)
                    # tool_config["parameters"] = {
                    #     "query": "string"
                    # }
                    
                    tool_config["body"] = tool.request_schema
                    
                    api_call_configs.append(tool_config)
            
            # Process collection fields
            collection_fields = []
            if node.agent.collection_fields:
                for field in node.agent.collection_fields:
                    # Remove spaces from field name
                    field_name = field.get("name", "").replace(" ", "") if field.get("name") else ""
                    collection_fields.append({
                        "name": field_name,
                        "type": field.get("type", "text"),
                        "required": field.get("required", False)
                    })
            
            # Add the agent configuration
            agent_config[key_name] = {
                "name": key_name,
                "voice": key_name,
                "description": node.agent.instructions or f"You are a {node.agent.name} agent.",
                "llm": llm_config,
                "transfer_agents": transfer_agents,
                "end_call_logic": end_call_logic,
                "collects": collection_fields
            }
            
            # Add TTS config if it exists and we're not using OpenAI Realtime
            if tts_config and not is_openai_realtime:
                agent_config[key_name]["tts"] = tts_config
                
            # Add RAG config if available
            if rag_config:
                agent_config[key_name]["rag_config"] = rag_config
                
            # Add API call configs if available
            if api_call_configs:  # Changed to use the array of configs
                agent_config[key_name]["api_call_configs"] = api_call_configs  # Changed key name to plural
            
            # # Add hangup_after_completion for specific agents if needed
            # if key_name.endswith("reporting"):
            #     agent_config[key_name]["hangup_after_completion"] = True
        
        # If no starting agent was found or the start node isn't connected,
        # use the first agent in the list as fallback
        if not starting_agent and agent_config:
            starting_agent = next(iter(agent_config.keys()))
        
        # Build the complete JSON structure
        workflow_json = {
            "agents": agent_config,
            "starting_agent": starting_agent
        }
        print(f"Workflow JSON in db function : {json.loads(json.dumps(workflow_json))}")
        # Return proper JSON with double quotes
        return json.loads(json.dumps(workflow_json))  
