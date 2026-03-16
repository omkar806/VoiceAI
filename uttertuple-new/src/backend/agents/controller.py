from typing import Any, List
from fastapi import APIRouter, HTTPException, status, Request, Body
import logging
from schemas.agent import (
    Agent, 
    AgentCompactResponse, 
    AgentCreate, 
    AgentTool, 
    AgentToolCreate,
    AgentToolUpdate, 
    AgentUpdate
)
from auth.manager import AuthManager
from schemas.roles import Roles
from agents.manager import AgentManager

class AgentsRestController:
    def __init__(self, agent_manager: AgentManager,auth_manager: AuthManager):
        self.agent_manager = agent_manager
        self.auth_manager = auth_manager

    def prepare(self,app: APIRouter):
        @app.get("/agents", response_model=List[Agent], tags=["agents"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_agents(
            request: Request,
            skip: int = 0,
            limit: int = 100,
        ) -> Any:
            """
            Get all agents for the current user.
            """
            
            user = request.state.user
            logging.info(f"Getting agents for organization: {user['current_organization']}")
            logging.info(f"User ID: {user['user_id']}")
            agents = self.agent_manager.get_by_user_id(user_id=user["user_id"], organization_id=user["current_organization"], skip=skip, limit=limit)
            return agents


        @app.get("/agents/compact", response_model=List[AgentCompactResponse], tags=["agents"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_agents_compact(
            request: Request,
        ) -> Any:
            """
            Get compact list of agents for dropdowns.
            """
            user = request.state.user
            agents = self.agent_manager.get_compact_list(user_id=user["user_id"], organization_id=user["current_organization"])
            return agents


        @app.post("/agents", response_model=Agent, tags=["agents"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def create_agent(
            request: Request,
            agent_in: AgentCreate = Body(...),
        ) -> Any:
            """
            Create a new agent.
            """
            logging.info(f"Creating agent: {agent_in.model_dump()}")
            
            user = request.state.user
            agent = self.agent_manager.create(user_id=user["user_id"], organization_id=user["current_organization"], obj_in=agent_in)
            return agent


        @app.get("/agents/{agent_id}", response_model=Agent, tags=["agents"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_agent(
            request: Request,
            agent_id: str,
        ) -> Any:
            """
            Get an agent by ID.
            """
            user = request.state.user
            agent = self.agent_manager.get_by_id(agent_id=agent_id, organization_id=user["current_organization"], user_id=user["user_id"])
            if not agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Agent not found",
                )
            logging.info(f"Agent: {agent.user_id}")
            logging.info(f"User: {user['user_id']}")
            if str(agent.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this agent",
                )
            return agent


        @app.put("/agents/{agent_id}", response_model=Agent, tags=["agents"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def update_agent(
            request: Request,
            agent_id: str,
            agent_in: AgentUpdate = Body(...),
        ) -> Any:
            """
            Update an agent.
            """
            user = request.state.user
            agent = self.agent_manager.get_by_id(agent_id=agent_id, organization_id=user["current_organization"], user_id=user["user_id"])
            if not agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Agent not found",
                )
            if str(agent.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to update this agent",
                )
            agent = self.agent_manager.update(db_obj=agent, obj_in=agent_in, organization_id=user["current_organization"], user_id=user["user_id"])
            return agent


        @app.delete("/agents/{agent_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["agents"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def delete_agent(
            request: Request,
            agent_id: str,
        ) -> None:
            """
            Delete an agent.
            """
            user = request.state.user
            agent = self.agent_manager.get_by_id(agent_id=agent_id, organization_id=user["current_organization"], user_id=user["user_id"])
            if not agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Agent not found",
                )
            logging.info(f"Agent: {agent.user_id}")
            logging.info(f"User: {user['user_id']}")
            logging.info(f"type of agent.user_id: {type(agent.user_id)}")
            logging.info(f"type of user['user_id']: {type(user['user_id'])}")
            logging.info(f"comparing : {agent.user_id == user['user_id']}")
            if str(agent.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to delete this agent",
                )
            self.agent_manager.delete(agent_id=agent_id, organization_id=user["current_organization"], user_id=user["user_id"])


        # Agent Tools endpoints

        @app.get("/agents/{agent_id}/tools", response_model=List[AgentTool], tags=["agents"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_agent_tools(
            request: Request,
            agent_id: str,
        ) -> Any:
            """
            Get all tools for an agent.
            """
            user = request.state.user
            agent = self.agent_manager.get_by_id(agent_id=agent_id, organization_id=user["current_organization"], user_id=user["user_id"])
            if not agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Agent not found",
                )
            if str(agent.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this agent",
                )
            return self.agent_manager.get_tools_by_agent_id(agent_id=agent_id, organization_id=user["current_organization"], user_id=user["user_id"])


        @app.post("/agents/{agent_id}/tools", response_model=AgentTool, tags=["agents"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def create_agent_tool(
            request: Request,
            agent_id: str,
            tool_in: AgentToolCreate = Body(...),
        ) -> Any:
            """
            Create a new tool for an agent.
            """
            user = request.state.user
            agent = self.agent_manager.get_by_id(agent_id=agent_id, organization_id=user["current_organization"], user_id=user["user_id"])
            if not agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Agent not found",
                )
            if str(agent.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this agent",
                )
            tool = self.agent_manager.create_tool(agent_id=agent_id, obj_in=tool_in, organization_id=user["current_organization"],user_id=user["user_id"])
            return tool


        @app.put("/agents/{agent_id}/tools/{tool_id}", response_model=AgentTool, tags=["agents"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def update_agent_tool(
            request: Request,
            agent_id: str,
            tool_id: str,
            tool_in: AgentToolUpdate = Body(...),
        ) -> Any:
            """
            Update a tool for an agent.
            """
            user = request.state.user
            agent = self.agent_manager.get_by_id(agent_id=agent_id, organization_id=user["current_organization"], user_id=user["user_id"])
            if not agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Agent not found",
                )
            if str(agent.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this agent",
                )
            
            tool = self.agent_manager.get_tool_by_id(tool_id=tool_id, organization_id=user["current_organization"], user_id=user["user_id"])
            if not tool:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tool not found",
                )
            
            tool = self.agent_manager.update_tool(db_obj=tool, obj_in=tool_in, organization_id=user["current_organization"], user_id=user["user_id"])
            return tool


        @app.delete("/agents/{agent_id}/tools/{tool_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["agents"] )
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def delete_agent_tool(
            request: Request,
            agent_id: str,
            tool_id: str,
        ) -> None:
            """
            Delete a tool from an agent.
            """
            user = request.state.user
            agent = self.agent_manager.get_by_id(agent_id=agent_id, organization_id=user["current_organization"], user_id=user["user_id"])
            if not agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Agent not found",
                )
            if str(agent.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this agent",
                )
            
            tool = self.agent_manager.get_tool_by_id(tool_id=tool_id, organization_id=user["current_organization"], user_id=user["user_id"])
            if not tool:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tool not found",
                )
            
            self.agent_manager.delete_tool(tool_id=tool_id, organization_id=user["current_organization"], user_id=user["user_id"])
