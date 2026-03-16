
from livekit import api
from livekit.protocol.sip import ListSIPInboundTrunkRequest
import os
from dotenv import load_dotenv

load_dotenv()

async def setup_inbound_trunk():
  lkapi = api.LiveKitAPI()
  try:
    # Check for existing trunks first
    try:
      existing_trunks = await lkapi.sip.list_sip_inbound_trunk(ListSIPInboundTrunkRequest())
      # Check if a trunk with the desired configuration already exists
      for trunk in existing_trunks.items:
        if any(number == os.getenv("OUTBOUND_CALL_NUMBERS") for number in trunk.numbers):
          print("Using existing inbound trunk")
          return trunk
    except Exception as e:
      print(f"Error checking existing inbound trunks: {str(e)}")
      # Continue to create a new trunk

    trunk = api.SIPInboundTrunkInfo(
      name = os.getenv("OUTBOUND_CALL_NAME"),
      numbers = [os.getenv("OUTBOUND_CALL_NUMBERS")],
      krisp_enabled = True,
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
