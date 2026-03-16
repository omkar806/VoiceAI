from typing import Any, List
from fastapi import APIRouter, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from auth.manager import AuthManager
from schemas.roles import Roles
from ai_chat_builder.manager import (
    AIChatBuilderManager,
    AGENT_BUILDER_SYSTEM_PROMPT,
    WORKFLOW_BUILDER_SYSTEM_PROMPT,
    ORCHESTRATOR_SYSTEM_PROMPT,
)
import logging
from ai_chat_builder.models.models import AIBuilderChatRequest
logger = logging.getLogger(__name__)

class AIChatBuilderRestController:
    def __init__(self, ai_chat_builder_manager: AIChatBuilderManager, auth_manager: AuthManager):
        self.ai_chat_builder_manager = ai_chat_builder_manager
        self.auth_manager = auth_manager

    def prepare(self, app: APIRouter):

        @app.post("/ai-builder/chat", tags=["ai-builder"])
        @self.auth_manager.requires_auth(allowed_roles=[Roles.MEMBER])
        async def ai_builder_chat(
            request: Request,
            body: AIBuilderChatRequest,
        ) -> Any:
            """
            Chat with the AI Builder agent. Uses the user's own LLM provider.
            Returns a streaming SSE response.
            """
            user = request.state.user
            user_id = user["user_id"]
            organization_id = user["current_organization"]

            client, model = self.ai_chat_builder_manager.get_llm_client_and_model(
                user_id=user_id, llm_provider_id=body.llm_provider_id
            )
            if not client:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="LLM provider not found. Please configure one in Settings."
                )

            # Select the system prompt based on mode
            mode = body.mode or "auto"
            if mode == "workflow":
                system_prompt = WORKFLOW_BUILDER_SYSTEM_PROMPT
            elif mode == "agent":
                system_prompt = AGENT_BUILDER_SYSTEM_PROMPT
            else:
                system_prompt = ORCHESTRATOR_SYSTEM_PROMPT

            messages = [{"role": "system", "content": system_prompt}]
            for msg in body.messages:
                messages.append({"role": msg.role, "content": msg.content})

            return StreamingResponse(
                self.ai_chat_builder_manager.generate_sse(
                    messages=messages,
                    client=client,
                    model=model,
                    user_id=user_id,
                    organization_id=organization_id,
                    mode=mode,
                ),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                }
            )
