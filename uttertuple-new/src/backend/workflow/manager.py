import json
import os
import subprocess
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging
from sqlalchemy.orm import Session, joinedload, subqueryload
from sqlalchemy import func

from database.db_models import (
    ExecutionStatus, 
    Workflow, 
    WorkflowEdge, 
    WorkflowExecution, 
    WorkflowNode,
    NodeType
)
from schemas.workflow import (
    WorkflowCreate, 
    WorkflowUpdate, 
    WorkflowNodeCreate, 
    WorkflowNodeUpdate,
    WorkflowEdgeCreate,
    WorkflowEdgeUpdate,
    WorkflowExecutionCreate,
    WorkflowExecutionUpdate,
    WorkflowJsonExport
)
from providers.manager import ProviderManager
from database.db_models import TTSUserData, LLMUserData, RAGFileUpload, RAGVectorDB, Agent, AgentTool


class WorkflowManager:
    def __init__(self, db_session: Session, provider_manager: ProviderManager):
        self.db = db_session
        self.provider_manager = provider_manager

    # Workflow CRUD operations

    def get_by_id(self, workflow_id: str, user_id: str, organization_id: str, preload_relations: bool = False) -> Optional[Workflow]:
        """Get a workflow by ID"""
        # Special case for 'create' path parameter - return None to avoid UUID conversion error
        if workflow_id == 'create':
            return None
            
        query = self.db.query(Workflow)
        
        if preload_relations:
            query = query.options(
                joinedload(Workflow.nodes).joinedload(WorkflowNode.agent),
                joinedload(Workflow.edges),
            )
        
        workflow = query.filter(Workflow.id == workflow_id,Workflow.user_id == user_id,Workflow.organization_id == organization_id).first()
        
        # No need to set description manually, it's now a property on the Agent model
        return workflow


    def get_by_user_id(self, user_id: str, organization_id: str, skip: int = 0, limit: int = 100) -> List[Workflow]:
        """Get all workflows for a user with pagination"""
        # Query workflows with their nodes and agents
        workflows = self.db.query(Workflow).filter(Workflow.user_id == user_id,Workflow.organization_id == organization_id ).options(
            joinedload(Workflow.nodes).joinedload(WorkflowNode.agent),
            joinedload(Workflow.edges)
        ).offset(skip).limit(limit).all()
        
        # No need to manually set description as it's now a property on the Agent model
        return workflows


    def create(self, *, user_id: str,organization_id:str, obj_in: WorkflowCreate) -> Workflow:
        """Create a new workflow"""
        workflow_data = obj_in.dict()
        
        # Remove fields that don't exist in the Workflow model
        fields_to_remove = ['description', 'llm_model', 'llm_options']
        for field in fields_to_remove:
            if field in workflow_data:
                workflow_data.pop(field)
            
        db_obj = Workflow(user_id=user_id,organization_id=organization_id, **workflow_data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        print(f"Workflow created: {db_obj.id}")
        return db_obj


    def update(self, *, db_obj: Workflow, obj_in: WorkflowUpdate) -> Workflow:
        """Update a workflow"""
        update_data = obj_in.dict(exclude_unset=True)
        
        # Remove fields that don't exist in the Workflow model
        fields_to_remove = ['description', 'llm_model', 'llm_options']
        for field in fields_to_remove:
            if field in update_data:
                update_data.pop(field)
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def delete(self, *, workflow_id: str,user_id:str,organization_id:str) -> None:
        """Delete a workflow and all its nodes, edges, and executions"""
        db_obj = self.get_by_id(workflow_id,user_id,organization_id)
        if db_obj:
            self.db.delete(db_obj)
            self.db.commit()


    # WorkflowNode CRUD operations

    def get_node_by_id(self, node_id: str,user_id:str,organization_id:str) -> Optional[WorkflowNode]:
        """Get a workflow node by ID"""
        return self.db.query(WorkflowNode).filter(WorkflowNode.id == node_id,WorkflowNode.user_id == user_id,WorkflowNode.organization_id == organization_id).first()


    def get_nodes_by_workflow_id(self, workflow_id: str,user_id:str,organization_id:str) -> List[WorkflowNode]:
        """Get all nodes for a workflow"""
        # Use joinedload to get agent data efficiently
        nodes = self.db.query(WorkflowNode).options(
            joinedload(WorkflowNode.agent)
        ).filter(WorkflowNode.workflow_id == workflow_id,WorkflowNode.user_id == user_id,WorkflowNode.organization_id == organization_id).all()
        
        # Ensure each node has proper fields if needed
        for node in nodes:
            # Add description field for the node if needed
            if not hasattr(node, 'description'):
                node.description = None
            
            # No need to set agent description as it's now a property method
        
        return nodes


    def create_node(self, *, workflow_id: str,user_id:str,organization_id:str, obj_in: WorkflowNodeCreate) -> WorkflowNode:
        """Create a new node for a workflow"""
        node_data = obj_in.dict()
        db_obj = WorkflowNode(workflow_id=workflow_id,user_id=user_id,organization_id=organization_id, **node_data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        
        # If this is the first node or a start node, update the workflow JSON
        workflow = self.db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if workflow:
            # Only try to set initial_agent_id if the attribute exists
            if hasattr(workflow, 'initial_agent_id'):
                # If no initial agent is set or this is a start node, use this node
                if not workflow.initial_agent_id or obj_in.node_type == NodeType.START:
                    workflow.initial_agent_id = db_obj.id
                    self.db.add(workflow)
                    self.db.commit()
            else:
                # If initial_agent_id doesn't exist, we might need to update workflow_json instead
                # This is a placeholder for any JSON-based workflow configuration
                pass
        
        return db_obj


    def update_node(self, *, db_obj: WorkflowNode, obj_in: WorkflowNodeUpdate,user_id:str,organization_id:str) -> WorkflowNode:
        """Update a workflow node"""
        update_data = obj_in.dict(exclude_unset=True)
        update_data["user_id"] = user_id
        update_data["organization_id"] = organization_id
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def delete_node(self, *, node_id: str,user_id:str,organization_id:str) -> None:
        """Delete a workflow node"""
        db_obj = self.get_node_by_id(node_id,user_id,organization_id)
        if db_obj:
            # Check if this is the initial node in the workflow JSON
            workflow = self.db.query(Workflow).filter(Workflow.id == db_obj.workflow_id,Workflow.user_id == user_id,Workflow.organization_id == organization_id).first()
            
            # Initial agent ID might not exist in the DB model, so check workflow_json instead
            initial_agent_check = False
            if workflow and hasattr(workflow, 'initial_agent_id') and workflow.initial_agent_id == db_obj.id:
                initial_agent_check = True
            
            if initial_agent_check:
                # Find another node to be the initial node or set to None
                other_node = self.db.query(WorkflowNode).filter(
                    WorkflowNode.workflow_id == db_obj.workflow_id,
                    WorkflowNode.id != db_obj.id,
                    WorkflowNode.user_id == user_id,
                    WorkflowNode.organization_id == organization_id
                ).first()
                
                if hasattr(workflow, 'initial_agent_id'):
                    workflow.initial_agent_id = other_node.id if other_node else None
                    self.db.add(workflow)
            
            self.db.delete(db_obj)
            self.db.commit()


    # WorkflowEdge CRUD operations

    def get_edge_by_id(self, edge_id: str,user_id:str,organization_id:str) -> Optional[WorkflowEdge]:
        """Get a workflow edge by ID"""
        return self.db.query(WorkflowEdge).filter(WorkflowEdge.id == edge_id,WorkflowEdge.user_id == user_id,WorkflowEdge.organization_id == organization_id).first()


    def get_edges_by_workflow_id(self, workflow_id: str,user_id:str,organization_id:str) -> List[WorkflowEdge]:
        """Get all edges for a workflow"""
        return self.db.query(WorkflowEdge).filter(WorkflowEdge.workflow_id == workflow_id,WorkflowEdge.user_id == user_id,WorkflowEdge.organization_id == organization_id).all()


    def create_edge(self, *, workflow_id: str,user_id:str,organization_id:str, obj_in: WorkflowEdgeCreate) -> WorkflowEdge:
        """Create a new edge for a workflow"""
        edge_data = obj_in.dict()
        db_obj = WorkflowEdge(workflow_id=workflow_id,user_id=user_id,organization_id=organization_id, **edge_data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def update_edge(self, *, db_obj: WorkflowEdge, obj_in: WorkflowEdgeUpdate,user_id:str,organization_id:str) -> WorkflowEdge:
        """Update a workflow edge"""
        update_data = obj_in.model_dump(exclude_unset=True)
        update_data["user_id"] = user_id
        update_data["organization_id"] = organization_id
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def delete_edge(self, *, edge_id: str,user_id:str,organization_id:str) -> None:
        """Delete a workflow edge"""
        db_obj = self.get_edge_by_id(edge_id,user_id,organization_id)
        if db_obj:
            self.db.delete(db_obj)
            self.db.commit()


    # Workflow Execution

    def get_execution_by_id(self, execution_id: str) -> Optional[WorkflowExecution]:
        """Get a workflow execution by ID"""
        return self.db.query(WorkflowExecution).filter(WorkflowExecution.id == execution_id).first()


    def get_executions_by_workflow_id(self, workflow_id: str, skip: int = 0, limit: int = 100) -> List[WorkflowExecution]:
        """Get all executions for a workflow with pagination"""
        return self.db.query(WorkflowExecution).filter(
            WorkflowExecution.workflow_id == workflow_id
        ).order_by(WorkflowExecution.started_at.desc()).offset(skip).limit(limit).all()


    def create_execution(self, *, workflow_id: str, obj_in: WorkflowExecutionCreate = None) -> WorkflowExecution:
        """Create a new workflow execution"""
        db_obj = WorkflowExecution(
            workflow_id=workflow_id,
            status=ExecutionStatus.RUNNING,
            session_id=str(uuid.uuid4())
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def update_execution(self, *, db_obj: WorkflowExecution, obj_in: WorkflowExecutionUpdate) -> WorkflowExecution:
        """Update a workflow execution"""
        update_data = obj_in.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        # If marking as completed or failed, set the ended_at time
        if update_data.get("status") in [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELED]:
            db_obj.ended_at = datetime.utcnow()
        
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def stop_execution(self, *, execution_id: str) -> Optional[WorkflowExecution]:
        """Stop a running workflow execution"""
        db_obj = self.get_execution_by_id(execution_id)
        if db_obj and db_obj.status == ExecutionStatus.RUNNING:
            db_obj.status = ExecutionStatus.CANCELED
            db_obj.ended_at = datetime.utcnow()
            self.db.add(db_obj)
            self.db.commit()
            self.db.refresh(db_obj)
        return db_obj


    # Workflow export/import for agent-framework

    def export_workflow_to_json(self, *, workflow_id: str) -> WorkflowJsonExport:
        """Export a workflow to JSON format compatible with multi-agent framework"""
        workflow = self.get_by_id(workflow_id, preload_relations=True)
        if not workflow:
            raise ValueError(f"Workflow with ID {workflow_id} not found")
        
        # Get all nodes
        nodes_by_id = {node.id: node for node in workflow.nodes}
        
        # Get all edges
        edges_by_source = {}
        for edge in workflow.edges:
            if edge.source_node_id not in edges_by_source:
                edges_by_source[edge.source_node_id] = []
            edges_by_source[edge.source_node_id].append(edge)
        
        # Find start node and agent nodes
        start_node = None
        end_nodes = []
        agent_nodes = []
        
        for node in workflow.nodes:
            if node.node_type == NodeType.START:
                start_node = node
            elif node.node_type == NodeType.END:
                end_nodes.append(node)
            elif node.node_type == NodeType.AGENT and node.agent_id:
                agent_nodes.append(node)
        
        if not start_node:
            raise ValueError("Workflow must have a start node")
        
        # Get end node IDs
        end_node_ids = {node.id for node in end_nodes}
        
        # Build agents list
        agents_json = []
        
        for node in agent_nodes:
            # Ensure agent exists
            if not node.agent:
                continue
            
            # Get transitions (target nodes this agent can transition to)
            transitions = []
            custom_tools = []
            
            if node.id in edges_by_source:
                for edge in edges_by_source[node.id]:
                    target_node = nodes_by_id.get(edge.target_node_id)
                    # Skip transitions to end nodes
                    if target_node and target_node.id in end_node_ids:
                        continue
                        
                    if target_node and target_node.agent_id and target_node.agent:
                        # Use agent name for transitions
                        target_agent_name = target_node.agent.name
                        transitions.append(target_agent_name)
                        
                        # Create transition tool with target agent name instead of ID
                        tool_data = {
                            "name": f"to_{target_agent_name}",
                            "description": f"Transition to the {target_agent_name} agent.",
                            "parameters": [],
                            "response_type": "tuple",
                            "confirmation_required": False
                        }
                        
                        # If the edge has condition data, use it
                        if edge.condition:
                            # Override tool defaults with condition values
                            tool_data.update({
                                "name": edge.condition.get("name", tool_data["name"]),
                                "description": edge.condition.get("description", tool_data["description"]),
                                "parameters": edge.condition.get("parameters", []),
                                "response_type": edge.condition.get("response_type", "tuple"),
                                "confirmation_required": edge.condition.get("confirmation_required", False)
                            })
                        
                        # Include state data if it exists
                        if edge.state:
                            tool_data["state"] = edge.state
                        
                        custom_tools.append(tool_data)
            
            # Build agent JSON
            agent_json = {
                "name": node.agent.name,
                "instructions": node.agent.instructions,
                "transitions": transitions,
                "custom_tools": custom_tools,
            }
            
            # Add optional fields
            if node.agent.voice_id:
                agent_json["voice_id"] = node.agent.voice_id
            
            if hasattr(node.agent, 'llm_model') and node.agent.llm_model:
                agent_json["llm_model"] = node.agent.llm_model
                
            if hasattr(node.agent, 'llm_options') and node.agent.llm_options:
                agent_json["llm_options"] = node.agent.llm_options
            
            # Add it to the list
            agents_json.append(agent_json)
        
        # Find initial agent
        initial_agent = None
        if start_node and start_node.id in edges_by_source:
            start_edge = edges_by_source[start_node.id][0]  # Take the first edge from start
            target_node = nodes_by_id.get(start_edge.target_node_id)
            if target_node and target_node.agent:
                initial_agent = target_node.agent.name
        
        if not initial_agent and agent_nodes:
            # Fall back to the first agent
            initial_agent = agent_nodes[0].agent.name
        
        if not initial_agent:
            raise ValueError("No valid agents found in workflow")
        
        # Build the complete JSON
        workflow_json = WorkflowJsonExport(
            flow_name=workflow.name,
            agents=agents_json,
            initial_agent=initial_agent,
            default_context=workflow.default_context or {},
            initial_greeting=workflow.initial_greeting,
            llm_model="gpt-4o-mini",  # Default LLM model
            llm_options={},  # Default empty options
        )
        
        return workflow_json


    def run_workflow(self, *, workflow_id: str, temp_dir: str = "/tmp") -> WorkflowExecution:
        """Export workflow to JSON and start subprocess to run it"""
        # Create execution record
        execution = self.create_execution(workflow_id=workflow_id)
        
        try:
            # Export workflow to JSON
            workflow_json = self.export_workflow_to_json(workflow_id=workflow_id)
            
            # Write to temp file
            json_path = os.path.join(temp_dir, f"agent_flow_{execution.id}.json")
            with open(json_path, 'w') as f:
                f.write(workflow_json.model_dump_json())
            
            # Start subprocess
            env = os.environ.copy()
            env["AGENT_FLOW_CONFIG"] = json_path
            
            # Start process detached
            subprocess.Popen(
                ["python", "-m", "multi_agent_framework"],
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True
            )
            
            # Update execution with JSON data
            self.update_execution(
                db_obj=execution, 
                obj_in=WorkflowExecutionUpdate(
                    runtime_data={"config_path": json_path}
                )
            )
            
            return execution
        except Exception as e:
            # Update execution with error
            self.update_execution(
                db_obj=execution, 
                obj_in=WorkflowExecutionUpdate(
                    status=ExecutionStatus.FAILED,
                    error_message=str(e)
                )
            )
            raise 


    async def generate_workflow_json_from_db(self, workflow_id: str,user_id:str,organization_id:str) -> Dict[str, Any]:
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
        workflow = self.db.query(Workflow).filter(Workflow.id == workflow_id,Workflow.user_id == user_id,Workflow.organization_id == organization_id).first()
        if not workflow:
            raise ValueError(f"Workflow with ID {workflow_id} not found")
        
        # Get all nodes for this workflow with agent data and tools eagerly loaded
        nodes = self.db.query(WorkflowNode).options(
            joinedload(WorkflowNode.agent).subqueryload(Agent.tools)
        ).filter(WorkflowNode.workflow_id == workflow_id).all()
        
        # Get all edges for this workflow
        edges = self.db.query(WorkflowEdge).filter(WorkflowEdge.workflow_id == workflow_id,WorkflowEdge.user_id == user_id,WorkflowEdge.organization_id == organization_id).all()
        
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
            
            try:
                self._process_agent_node_for_json(
                    node, agent_node_id_to_key, edges, nodes, agent_config,
                    user_id, organization_id, workflow_id
                )
            except Exception as e:
                import traceback
                logging.error(f"Error processing agent node '{node.agent.name}' (id={node.id}): {type(e).__name__}: {e}\n{traceback.format_exc()}")
                raise
        
        # If no starting agent was found or the start node isn't connected,
        # use the first agent in the list as fallback
        if not starting_agent and agent_config:
            starting_agent = next(iter(agent_config.keys()))
        
        # Build the complete JSON structure
        workflow_json = {
            "agents": agent_config,
            "starting_agent": starting_agent
        }
        def _json_safe(obj):
            """Handle non-JSON-serializable types."""
            if hasattr(obj, 'value'):
                return obj.value
            return str(obj)

        serialized = json.dumps(workflow_json, default=_json_safe)
        logging.info(f"Workflow JSON generated successfully")
        return json.loads(serialized)

    def _process_agent_node_for_json(
        self, node, agent_node_id_to_key, edges, nodes, agent_config,
        user_id, organization_id, workflow_id
    ):
        """Process a single agent node and add its config to agent_config dict."""
        from database.db_models import NodeType

        key_name = agent_node_id_to_key[str(node.id)]

        outgoing_edges = [e for e in edges if str(e.source_node_id) == str(node.id)]

        transfer_agents = []
        for edge in outgoing_edges:
            target_node = next((n for n in nodes if str(n.id) == str(edge.target_node_id)), None)

            if target_node and target_node.node_type == NodeType.AGENT:
                target_key = agent_node_id_to_key.get(str(target_node.id))

                if target_key:
                    condition_description = ""
                    if edge.condition and 'name' in edge.condition and edge.condition['name'] == 'AI Condition':
                        condition_description = edge.condition.get('description', '')

                    transfer_agents.append({
                        "agent_name": target_key,
                        "transfer_logic": condition_description
                    })

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
            if node.agent.llm_model == "openai-realtime":
                is_openai_realtime = True

                llm_user_data = self.db.query(LLMUserData).filter(
                    LLMUserData.user_id == node.agent.user_id,
                    LLMUserData.provider_name == "openai",
                    LLMUserData.organization_id == organization_id
                ).first()

                voice = ""
                if node.agent.llm_config and "voice" in node.agent.llm_config:
                    voice = node.agent.llm_config["voice"]

                if llm_user_data:
                    llm_api_key = self.provider_manager.get_decrypted_llm_api_key(llm_user_data)
                    llm_config = {
                        "provider": "openai-realtime",
                        "api_key": llm_api_key,
                        "voice": voice
                    }
            else:
                llm_provider_name = ""
                llm_model_name = node.agent.llm_model or "gpt-4o"

                if node.agent.llm_config and "provider" in node.agent.llm_config:
                    llm_provider_name = node.agent.llm_config["provider"]
                else:
                    llm_user_data = self.db.query(LLMUserData).filter(
                        LLMUserData.id == node.agent.llm_provider_id,
                        LLMUserData.organization_id == organization_id,
                        LLMUserData.user_id == user_id
                    ).first()

                    if llm_user_data:
                        llm_provider_name = llm_user_data.provider_name

                llm_user_data = self.db.query(LLMUserData).filter(
                    LLMUserData.user_id == node.agent.user_id,
                    LLMUserData.provider_name == llm_provider_name,
                    LLMUserData.organization_id == organization_id
                ).first()

                if llm_user_data:
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
                tts_user_data = self.db.query(TTSUserData).filter(
                    TTSUserData.user_id == node.agent.user_id,
                    TTSUserData.id == node.agent.tts_provider_id,
                    TTSUserData.organization_id == organization_id
                ).first()

                if tts_user_data:
                    tts_api_key = self.provider_manager.get_decrypted_tts_api_key(tts_user_data)
                    tts_config = {
                        "provider": tts_user_data.provider_name,
                        "api_key": tts_api_key,
                        "voice": node.agent.voice_id
                    }

                    if tts_user_data.provider_name == 'kokoro' and tts_user_data.base_url:
                        tts_config["base_url"] = tts_user_data.base_url
                        tts_config["response_format"] = tts_user_data.response_format

        # Process RAG configuration
        rag_config = None
        logging.info(f"Processing RAG config for agent {node.agent.name}")
        if node.agent.rag_config and len(node.agent.rag_config) > 0:
            for rag_conf in node.agent.rag_config:
                logging.info(f"Found RAG config: {rag_conf}")
                files = self.db.query(RAGFileUpload).filter(
                    RAGFileUpload.vector_db_id == rag_conf['id'],
                    RAGFileUpload.user_id == user_id,
                    RAGFileUpload.organization_id == organization_id,
                    RAGFileUpload.index_name == rag_conf['collection_name'],
                    RAGFileUpload.status == 'completed'
                ).all()
                logging.info(f"files count: {len(files)}")
                if files and len(files) > 0:
                    first_file = files[0]
                    combined_description = first_file.description
                    embedding_model = first_file.embedding_model
                    embedding_provider = first_file.embedding_provider
                    vector_db = self.db.query(RAGVectorDB).filter(
                        RAGVectorDB.id == rag_conf['id'],
                        RAGVectorDB.user_id == user_id,
                        RAGVectorDB.organization_id == organization_id
                    ).first()
                    if not vector_db:
                        logging.warning(f"Vector DB not found for RAG config id={rag_conf['id']}")
                        continue
                    rag_config = {
                        "enabled": True,
                        "knowledge_base_id": str(rag_conf['id']),
                        "collection_name": rag_conf['collection_name'],
                        "user_id": str(user_id),
                        "workflow_id": str(workflow_id),
                        "agent_id": str(node.id),
                        "description": combined_description or rag_conf.get('description', ''),
                        "embedding_model": embedding_model,
                        "embedding_provider": embedding_provider,
                        "vector_db_config": vector_db.config,
                        "vector_db_type": str(vector_db.db_type) if vector_db.db_type else "qdrant",
                    }
                    logging.info(f"Created RAG config: {rag_config}")
                    break
                else:
                    logging.info(f"No completed files found for collection {rag_conf['collection_name']}")
        else:
            logging.info("No RAG config found for this agent")

        # Process API call configuration
        api_call_configs = []
        try:
            agent_tools = node.agent.tools if hasattr(node.agent, 'tools') and node.agent.tools else []
        except Exception as tools_err:
            logging.warning(f"Could not load tools for agent {node.agent.name}: {tools_err}")
            agent_tools = []

        if agent_tools and len(agent_tools) > 0:
            for tool in agent_tools:
                tool_name = tool.name.replace(" ", "") if hasattr(tool, 'name') and tool.name else f"tool_{key_name}"

                tool_config = {
                    "enabled": "True",
                    "name": tool_name,
                    "base_url": tool.endpoint_url or f"https://api.{key_name}.example.com",
                    "default_headers": {
                        "Content-Type": "application/json"
                    },
                    "allowed_methods": [tool.method] if hasattr(tool, 'method') and tool.method else ["GET", "POST"],
                    "description": tool.description or f"This API call is used by the {node.agent.name} agent."
                }

                if tool.auth_type:
                    tool_config["authentication"] = tool.auth_config or {}

                tool_config["body"] = tool.request_schema

                api_call_configs.append(tool_config)

        # Process collection fields
        collection_fields = []
        if node.agent.collection_fields:
            for field in node.agent.collection_fields:
                field_name = field.get("name", "").replace(" ", "") if field.get("name") else ""
                collection_fields.append({
                    "name": field_name,
                    "type": field.get("type", "text"),
                    "required": field.get("required", False)
                })

        agent_config[key_name] = {
            "name": key_name,
            "voice": key_name,
            "description": node.agent.instructions or f"You are a {node.agent.name} agent.",
            "llm": llm_config,
            "transfer_agents": transfer_agents,
            "end_call_logic": end_call_logic,
            "collects": collection_fields
        }

        if tts_config and not is_openai_realtime:
            agent_config[key_name]["tts"] = tts_config

        if rag_config:
            agent_config[key_name]["rag_config"] = rag_config

        if api_call_configs:
            agent_config[key_name]["api_call_configs"] = api_call_configs