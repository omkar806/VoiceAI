from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from schemas.workflow import (
    Workflow, 
    WorkflowCreate, 
    WorkflowUpdate,
    WorkflowNode,
    WorkflowNodeCreate,
    WorkflowNodeUpdate,
    WorkflowEdge,
    WorkflowEdgeCreate,
    WorkflowEdgeUpdate
)
from auth.manager import AuthManager
from schemas.roles import Roles
import logging
import traceback
from workflow.manager import WorkflowManager



class WorkflowRestController:
    def __init__(self,auth_manager: AuthManager, workflow_manager: WorkflowManager):
        self.auth_manager = auth_manager
        self.workflow_manager = workflow_manager

    def prepare(self, app: APIRouter):
        @app.get("/workflows", response_model=List[Workflow], tags=["workflows"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_workflows(
            request: Request,
            skip: int = 0,
            limit: int = 100,
        ) -> Any:
            """
            Get all workflows for the current user.
            """
            user = request.state.user
            logging.info(f"User: {user}")
            logging.info(f"Getting workflows for user: {user}")
            workflows = self.workflow_manager.get_by_user_id(user_id=user["user_id"],organization_id=user["current_organization"], skip=skip, limit=limit)
            return workflows


        @app.post("/workflows", response_model=Workflow, tags=["workflows"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def create_workflow(
            request: Request,
            workflow_in: WorkflowCreate,
        ) -> Any:
            """
            Create a new workflow.
            """
            user = request.state.user
            workflow = self.workflow_manager.create(user_id=user["user_id"],organization_id=user["current_organization"], obj_in=workflow_in)
            return workflow


        @app.get("/workflows/{workflow_id}", response_model=Workflow, tags=["workflows"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_workflow(
            request: Request,
            workflow_id: str,
        ) -> Any:
            """
            Get a workflow by ID.
            """
            user = request.state.user
            workflow = self.workflow_manager.get_by_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found",
                )
            if str(workflow.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this workflow",
                )
            return workflow


        @app.put("/workflows/{workflow_id}", response_model=Workflow, tags=["workflows"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def update_workflow(
            request: Request,
            workflow_id: str,
            workflow_in: WorkflowUpdate,
        ) -> Any:
            """
            Update a workflow.
            """
            user = request.state.user
            workflow = self.workflow_manager.get_by_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found",
                )
            if str(workflow.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to update this workflow",
                )
            workflow = self.workflow_manager.update(db_obj=workflow, obj_in=workflow_in)
            return workflow


        @app.delete("/workflows/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["workflows"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def delete_workflow(
            request: Request,
            workflow_id: str,
        ) -> None:
            """
            Delete a workflow.
            """
            user = request.state.user
            workflow = self.workflow_manager.get_by_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found",
                )
            if str(workflow.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to delete this workflow",
                )
            self.workflow_manager.delete(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])


        # Workflow Nodes endpoints

        @app.get("/workflows/{workflow_id}/nodes", response_model=List[WorkflowNode], tags=["workflows"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_workflow_nodes(
            request: Request,
            workflow_id: str,
        ) -> Any:
            """
            Get all nodes for a workflow.
            """
            user = request.state.user
            workflow = self.workflow_manager.get_by_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found",
                )
            if str(workflow.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this workflow",
                )
            return self.workflow_manager.get_nodes_by_workflow_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])


        @app.post("/workflows/{workflow_id}/nodes", response_model=WorkflowNode, tags=["workflows"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def create_workflow_node(
            request: Request,
            workflow_id: str,
            node_in: WorkflowNodeCreate,
        ) -> Any:
            """
            Create a new node for a workflow.
            """
            user = request.state.user
            workflow = self.workflow_manager.get_by_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found",
                )
            if str(workflow.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this workflow",
                )
            node = self.workflow_manager.create_node(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"], obj_in=node_in)
            return node


        @app.put("/workflows/{workflow_id}/nodes/{node_id}", response_model=WorkflowNode, tags=["workflows"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def update_workflow_node(
            request: Request,
            workflow_id: str,
            node_id: str,
            node_in: WorkflowNodeUpdate,
        ) -> Any:
            """
            Update a node for a workflow.
            """
            user = request.state.user
            workflow = self.workflow_manager.get_by_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found",
                )
            if str(workflow.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this workflow",
                )
            
            node = self.workflow_manager.get_node_by_id(node_id=node_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not node:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Node not found",
                )
            if str(node.workflow_id) != str(workflow.id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Node does not belong to this workflow",
                )
            
            node = self.workflow_manager.update_node(db_obj=node, obj_in=node_in,user_id=user["user_id"],organization_id=user["current_organization"])
            return node


        @app.delete("/workflows/{workflow_id}/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["workflows"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def delete_workflow_node(
            request: Request,
            workflow_id: str,
            node_id: str,
        ) -> None:
            """
            Delete a node from a workflow.
            """
            user = request.state.user
            workflow = self.workflow_manager.get_by_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found",
                )
            if str(workflow.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this workflow",
                )
            
            node = self.workflow_manager.get_node_by_id(node_id=node_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not node:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Node not found",
                )
            if str(node.workflow_id) != str(workflow.id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Node does not belong to this workflow",
                )
            
            self.workflow_manager.delete_node(node_id=node_id,user_id=user["user_id"],organization_id=user["current_organization"])


        @app.get("/workflows/{workflow_id}/editor", response_model=Dict, tags=["workflows"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_workflow_for_editor(
            request: Request,
            workflow_id: str,
        ) -> Any:
            """
            Get workflow data formatted for the editor, with simplified agent objects.
            This endpoint avoids validation errors with agent models.
            """
            user = request.state.user
            workflow = self.workflow_manager.get_by_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"], preload_relations=True)
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found",
                )
            if str(workflow.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this workflow",
                )
            
            # Create a serializable dictionary with full control over the structure
            nodes = []
            for node in workflow.nodes:
                node_data = {
                    "id": str(node.id),
                    "workflow_id": str(node.workflow_id),
                    "node_type": node.node_type,
                    "position_x": node.position_x,
                    "position_y": node.position_y,
                    "data": node.data,
                    "created_at": node.created_at.isoformat(),
                    "updated_at": node.updated_at.isoformat(),
                }
                
                # Only include agent data if it exists
                if node.agent:
                    node_data["agent"] = {
                        "id": str(node.agent.id),
                        "name": node.agent.name,
                        "description": node.agent.description  # Now using the property method
                    }
                else:
                    node_data["agent"] = None
                    
                nodes.append(node_data)
            
            # Process edges
            edges = []
            for edge in workflow.edges:
                edges.append({
                    "id": str(edge.id),
                    "workflow_id": str(edge.workflow_id),
                    "source_node_id": str(edge.source_node_id),
                    "target_node_id": str(edge.target_node_id),
                    "condition": edge.condition,
                    "state": edge.state,
                    "label": edge.label,
                    "created_at": edge.created_at.isoformat(),
                    "updated_at": edge.updated_at.isoformat()
                })
            
            # Build the complete response
            response = {
                "id": str(workflow.id),
                "name": workflow.name,
                "user_id": str(workflow.user_id),
                "initial_greeting": workflow.initial_greeting,
                "default_context": workflow.default_context,
                "workflow_json": workflow.workflow_json,
                "created_at": workflow.created_at.isoformat(),
                "updated_at": workflow.updated_at.isoformat(),
                "nodes": nodes,
                "edges": edges
            }
            
            return response


        @app.get("/workflows/{workflow_id}/generate-json", response_model=Dict[str, Any], tags=["workflows"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        async def generate_workflow_json(
            request: Request,
            workflow_id: str,
        ) -> Any:
            """
            Generate workflow JSON directly from database tables.
            This endpoint is used by the frontend to get workflow JSON for execution.
            """
            user = request.state.user
            # Check if workflow exists and user has permission
            workflow = self.workflow_manager.get_by_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found",
                )
            if str(workflow.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this workflow",
                )
            
            try:
                # Generate workflow JSON directly from database
                workflow_json = await self.workflow_manager.generate_workflow_json_from_db(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])
                logging.info(f"Workflow JSON: {workflow_json}")
                return workflow_json
            except ValueError as e:
                logging.error(f"Error generating workflow JSON: {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e),
                )
            except Exception as e:
                logging.error(f"Unexpected error generating workflow JSON: {type(e).__name__}: {e}\n{traceback.format_exc()}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error generating workflow JSON: {type(e).__name__}: {e}",
                )


        # Workflow Edges endpoints

        @app.get("/workflows/{workflow_id}/edges", response_model=List[WorkflowEdge], tags=["workflows"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_workflow_edges(
            request: Request,
            workflow_id: str,
        ) -> Any:
            """
            Get all edges for a workflow.
            """
            user = request.state.user
            workflow = self.workflow_manager.get_by_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found",
                )
            if str(workflow.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this workflow",
                )
            return self.workflow_manager.get_edges_by_workflow_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])


        @app.post("/workflows/{workflow_id}/edges", response_model=WorkflowEdge, tags=["workflows"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def create_workflow_edge(
            request: Request,
            workflow_id: str,
            edge_in: WorkflowEdgeCreate,
        ) -> Any:
            """
            Create a new edge for a workflow.
            """
            user = request.state.user
            workflow = self.workflow_manager.get_by_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found",
                )
            if str(workflow.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this workflow",
                )
            edge = self.workflow_manager.create_edge(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"], obj_in=edge_in)
            return edge


        @app.put("/workflows/{workflow_id}/edges/{edge_id}", response_model=WorkflowEdge, tags=["workflows"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def update_workflow_edge(
            request: Request,
            workflow_id: str,
            edge_id: str,
            edge_in: WorkflowEdgeUpdate,
        ) -> Any:
            """
            Update an edge for a workflow.
            """
            user = request.state.user
            workflow = self.workflow_manager.get_by_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found",
                )
            if str(workflow.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this workflow",
                )
            
            edge = self.workflow_manager.get_edge_by_id(edge_id=edge_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not edge:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Edge not found",
                )
            if str(edge.workflow_id) != str(workflow.id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Edge does not belong to this workflow",
                )
            
            edge = self.workflow_manager.update_edge(db_obj=edge, obj_in=edge_in,user_id=user["user_id"],organization_id=user["current_organization"])
            return edge


        @app.delete("/workflows/{workflow_id}/edges/{edge_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["workflows"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def delete_workflow_edge(
            request: Request,
            workflow_id: str,
            edge_id: str,
        ) -> None:
            """
            Delete an edge from a workflow.
            """
            user = request.state.user
            workflow = self.workflow_manager.get_by_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found",
                )
            if str(workflow.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this workflow",
                )
            
            edge = self.workflow_manager.get_edge_by_id(edge_id=edge_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not edge:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Edge not found",
                )
            if str(edge.workflow_id) != str(workflow.id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Edge does not belong to this workflow",
                )
            
            self.workflow_manager.delete_edge(edge_id=edge_id,user_id=user["user_id"],organization_id=user["current_organization"])


        @app.get("/workflows/{workflow_id}/edges/{edge_id}", response_model=WorkflowEdge, tags=["workflows"] )
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_workflow_edge(
            request: Request,
            workflow_id: str,
            edge_id: str,
        ) -> Any:
            """
            Get a specific edge by ID.
            """
            user = request.state.user
            workflow = self.workflow_manager.get_by_id(workflow_id=workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not workflow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workflow not found",
                )
            if str(workflow.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this workflow",
                )
            
            edge = self.workflow_manager.get_edge_by_id(edge_id=edge_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not edge:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Edge not found",
                )
            if str(edge.workflow_id) != str(workflow.id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Edge does not belong to this workflow",
                )
            
            return edge


