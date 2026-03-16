import random
from livekit import api



async def create_dispatch(phone_number:str , agent_name:str,sip_trunk_id:str,agentic_workflow:dict):
    lkapi = api.LiveKitAPI()
    print("agentic_workflow: ",agentic_workflow)
    print("agentic_workflow type: ",type(agentic_workflow))
    await lkapi.agent_dispatch.create_dispatch(
        api.CreateAgentDispatchRequest(
        # Use the agent name you set in the WorkerOptions
        agent_name=agent_name, 

        # The room name to use. This should be unique for each call
        room=f"outbound-{''.join(str(random.randint(0, 9)) for _ in range(10))}",
        
        # Here we use JSON to pass the phone number, and could add more information if needed.
        metadata=f'{{"phone_number": "{phone_number}" , "sip_trunk_id": "{sip_trunk_id}" , "agentic_workflow": {agentic_workflow}}}'
    )
)
    await lkapi.aclose()