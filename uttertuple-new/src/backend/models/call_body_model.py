from pydantic import BaseModel

class CallModel(BaseModel):
    workflow_id: str
    call_type: str
    call_status: str
    phone_number: str
    agentic_workflow: dict