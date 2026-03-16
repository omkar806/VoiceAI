from common.config import Configuration
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload, Session
from sqlalchemy import and_
import logging
from database.db_models import Agent, AgentTool
from schemas.agent import AgentCreate, AgentUpdate, AgentToolCreate, AgentToolUpdate

class AgentManager:
    def __init__(self, config: Configuration,db_session: Session):
        self.config = config.configuration()
        self.db = db_session


    def get_by_id(self, agent_id: str, organization_id: str, user_id: str) -> Optional[Agent]:
        """Get an agent by ID with tools preloaded"""
        return self.db.query(Agent).options(joinedload(Agent.tools)).filter(
            and_(
                Agent.id == agent_id,
                Agent.organization_id == organization_id,
                Agent.user_id == user_id
            )
        ).first()


    def get_by_user_id(self, user_id: str, organization_id: str, skip: int = 0, limit: int = 100) -> List[Agent]:
        """Get all agents for a user with pagination"""
        return self.db.query(Agent).filter(
            and_(
                Agent.user_id == user_id,
                Agent.organization_id == organization_id
            )
        ).offset(skip).limit(limit).all()


    def get_compact_list(self, user_id: str, organization_id: str) -> List[Tuple[str, str, Optional[str]]]:
        """Get a compact list of agents for dropdowns (id, name, description)"""
        return self.db.query(Agent.id, Agent.name, Agent.instructions.label('description')).filter(
            and_(
                Agent.user_id == user_id,
                Agent.organization_id == organization_id
            )
        ).all()


    def create(self,user_id: str, organization_id: str, obj_in: AgentCreate) -> Agent:
        """Create a new agent with its tools"""
        # Create agent
        agent_data = obj_in.model_dump(exclude={"tools"})
        logging.info(f"Creating agent: {agent_data}")
        logging.info(f"agent data type: {type(agent_data)}")
        db_obj = Agent(user_id=user_id, organization_id=organization_id, **agent_data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        
        # Create tools if provided
        if obj_in.tools:
            for tool_in in obj_in.tools:
                self.create_tool(agent_id=str(db_obj.id), obj_in=tool_in)
            
            # Refresh to get tools
            self.db.refresh(db_obj)
        
        return db_obj


    def update(self, db_obj: Agent, obj_in: AgentUpdate, organization_id: str, user_id: str) -> Agent:
        """Update an agent"""
        logging.info(f"Updating agent: {obj_in}")
        update_data = obj_in.model_dump(exclude={"tools"}, exclude_unset=True)
        
        # Handle tools separately if they exist in the update data
        tools = obj_in.tools
        logging.info(f"Tools: {tools}")
        # Update agent fields
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        logging.info(f"tools: {tools}")
        
        # Update tools if provided
        if tools is not None:
            existing_tools = {tool.id: tool for tool in self.get_tools_by_agent_id(agent_id=str(db_obj.id))}
            existing_tools_by_name = {tool.name: tool for tool in existing_tools.values()}
            
            # Process each tool in the update
            for tool_data in tools:
                tool_id = getattr(tool_data, 'id', None)
                tool_name = tool_data.name if hasattr(tool_data, 'name') else None
                
                # Try to find existing tool by ID or name
                existing_tool = None
                if tool_id and tool_id in existing_tools:
                    existing_tool = existing_tools[tool_id]
                elif tool_name and tool_name in existing_tools_by_name:
                    existing_tool = existing_tools_by_name[tool_name]
                    
                if existing_tool:
                    # Update existing tool
                    self.update_tool(db_obj=existing_tool, obj_in=tool_data)
                    # Remove from tracking dict to mark as processed
                    if existing_tool.id in existing_tools:
                        del existing_tools[existing_tool.id]
                    if existing_tool.name in existing_tools_by_name:
                        del existing_tools_by_name[existing_tool.name]
                else:
                    # Create new tool
                    self.create_tool(agent_id=str(db_obj.id), obj_in=tool_data)
            
            # Refresh to get updated tools
            self.db.refresh(db_obj)
        
        return db_obj


    def delete(self, agent_id: str, organization_id: str, user_id: str) -> None:
        """Delete an agent and its tools"""
        db_obj = self.get_by_id(agent_id, organization_id, user_id)
        if db_obj:
            self.db.delete(db_obj)
            self.db.commit()


    def get_tool_by_id(self, tool_id: str, organization_id: str, user_id: str) -> Optional[AgentTool]:
        """Get a tool by ID"""
        return self.db.query(AgentTool).filter(
            and_(
                AgentTool.id == tool_id,
                AgentTool.organization_id == organization_id,
                AgentTool.user_id == user_id
            )
        ).first()


    def get_tools_by_agent_id(self, agent_id: str, organization_id: str = None, user_id: str = None) -> List[AgentTool]:
        """Get all tools for an agent"""
        if organization_id and user_id:
            return self.db.query(AgentTool).filter(
                and_(
                    AgentTool.agent_id == agent_id,
                    AgentTool.organization_id == organization_id,
                    AgentTool.user_id == user_id
                )
            ).all()
        else:
            # If organization_id and user_id are not provided, just filter by agent_id
            return self.db.query(AgentTool).filter(AgentTool.agent_id == agent_id).all()


    def create_tool(self, agent_id: str, obj_in: AgentToolCreate, organization_id: str, user_id: str) -> AgentTool:
        """Create a new tool for an agent"""
        tool_data = obj_in.model_dump()
        db_obj = AgentTool(agent_id=agent_id, organization_id=organization_id, user_id=user_id, **tool_data)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def update_tool(self, db_obj: AgentTool, obj_in: AgentToolUpdate, organization_id: str, user_id: str) -> AgentTool:
        """Update a tool"""
        update_data = obj_in.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj


    def delete_tool(self, tool_id: str, organization_id: str, user_id: str) -> None:
        """Delete a tool"""
        db_obj = self.get_tool_by_id(tool_id, organization_id, user_id)
        if db_obj:
            self.db.delete(db_obj)
            self.db.commit() 