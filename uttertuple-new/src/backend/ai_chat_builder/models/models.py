from pydantic import BaseModel
from typing import List

class ChatMessage(BaseModel):
    role: str
    content: str


class AIBuilderChatRequest(BaseModel):
    messages: List[ChatMessage]
    llm_provider_id: str
    mode: str = "auto"