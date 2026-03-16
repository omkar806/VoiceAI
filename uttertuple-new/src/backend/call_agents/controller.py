from call_agents.manager import CallAgentManager
from auth.manager import AuthManager
from fastapi import APIRouter, HTTPException, status , Request
from schemas.call_agent import CallAgent, CallAgentCreate, CallAgentUpdate
import logging
from typing import Any, List
from auth.manager import AuthManager
from schemas.roles import Roles


class CallAgentRestController:
    def __init__(self, call_agent_manager: CallAgentManager, auth_manager: AuthManager):
        self.call_agent_manager = call_agent_manager
        self.auth_manager = auth_manager


    def prepare(self, app: APIRouter):

        @app.get("/call-agents", response_model=List[CallAgent], tags=["call_agents"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_call_agents(
            request: Request,
            skip: int = 0,
            limit: int = 100,
        ) -> Any:
            """
            Get all call agents for the current user.
            """
            user = request.state.user
            call_agents = self.call_agent_manager.get_by_user_id(user_id=user["user_id"],organization_id=user["current_organization"], skip=skip, limit=limit)
            return call_agents


        @app.post("/call-agents", response_model=CallAgent, tags=["call_agents"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        async def create_call_agent(
            request: Request,
            call_agent_in: CallAgentCreate,
        ) -> Any:
            """
            Create a new call agent.
            """
            user = request.state.user
            call_agent = await self.call_agent_manager.create(user_id=user["user_id"],organization_id=user["current_organization"], obj_in=call_agent_in)
            logging.info(f"Call agent created: {call_agent}")
            logging.info(f"Call agent workflow id: {call_agent.phone_numbers}")
            workflow_json = await self.call_agent_manager.generate_workflow_json_from_db(workflow_id=call_agent.workflow_id,user_id=user["user_id"],organization_id=user["current_organization"])
            logging.info(f"Workflow json: {workflow_json}")
            # await process_call(call_agent_in,workflow_json)
            return call_agent


        @app.get("/call-agents/{call_agent_id}", response_model=CallAgent, tags=["call_agents"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def get_call_agent(
            request: Request,
            call_agent_id: str,
        ) -> Any:
            """
            Get a call agent by ID.
            """
            user = request.state.user
            call_agent = self.call_agent_manager.get_by_id(call_agent_id=call_agent_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not call_agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Call agent not found",
                )
            if str(call_agent.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to access this call agent",
                )
            return call_agent


        @app.put("/call-agents/{call_agent_id}", response_model=CallAgent, tags=["call_agents"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def update_call_agent(
            request: Request,
            call_agent_id: str,
            call_agent_in: CallAgentUpdate,
        ) -> Any:
            """
            Update a call agent.
            """
            user = request.state.user
            call_agent = self.call_agent_manager.get_by_id(call_agent_id=call_agent_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not call_agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Call agent not found",
                )
            if str(call_agent.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to update this call agent",
                )
            call_agent = self.call_agent_manager.update(db_obj=call_agent, obj_in=call_agent_in,user_id=user["user_id"],organization_id=user["current_organization"])
            return call_agent


        @app.delete("/call-agents/{call_agent_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["call_agents"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        def delete_call_agent(
            request: Request,
            call_agent_id: str,
        ) -> None:
            """
            Delete a call agent.
            """
            user = request.state.user
            call_agent = self.call_agent_manager.get_by_id(call_agent_id=call_agent_id,user_id=user["user_id"],organization_id=user["current_organization"])
            if not call_agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Call agent not found",
                )
            if str(call_agent.user_id) != str(user["user_id"]):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to delete this call agent",
                )
            self.call_agent_manager.delete(call_agent_id=call_agent_id,user_id=user["user_id"],organization_id=user["current_organization"])



        # class CallAgentBase(BaseModel):
        #     workflow_id: uuid.UUID
        #     call_type: str
        #     phone_numbers: Optional[List[str]] = None


