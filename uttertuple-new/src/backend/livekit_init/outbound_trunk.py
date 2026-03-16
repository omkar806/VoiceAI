import asyncio

from livekit import api
from livekit.protocol.sip import CreateSIPOutboundTrunkRequest, SIPOutboundTrunkInfo
from livekit.protocol.sip import ListSIPOutboundTrunkRequest
from api import get_livekit_api
import os
from dotenv import load_dotenv

load_dotenv()

async def setup_outbound_trunk():
#   livekit_api = get_livekit_api()
  lkapi = api.LiveKitAPI()
  try:
    # Check for existing trunks first
    try:
      existing_trunks = await lkapi.sip.list_sip_outbound_trunk(ListSIPOutboundTrunkRequest())
      # Check if a trunk with the desired configuration already exists
      for trunk in existing_trunks.items:
        if any(number == os.getenv("OUTBOUND_CALL_NUMBERS") for number in trunk.numbers):
          print("Using existing outbound trunk")
          return trunk
    except Exception as e:
      print(f"Error checking existing outbound trunks: {str(e)}")
      # Continue to create a new trunk

    trunk = SIPOutboundTrunkInfo(
      name = os.getenv("OUTBOUND_CALL_NAME"),
      address = os.getenv("OUTBOUND_CALL_ADDRESS"),
      numbers = [os.getenv("OUTBOUND_CALL_NUMBERS")],
      auth_username = os.getenv("OUTBOUND_CALL_AUTH_USERNAME"),
      auth_password = os.getenv("OUTBOUND_CALL_AUTH_PASSWORD")
    )

    request = CreateSIPOutboundTrunkRequest(
      trunk = trunk
    )

    trunk = await lkapi.sip.create_sip_outbound_trunk(request)
    print("Created new outbound trunk:", trunk)
    return trunk
    
  except Exception as e:
    print(f"Error in setup_outbound_trunk: {str(e)}")
    return None
    
  finally:
    await lkapi.aclose()