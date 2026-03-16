import { NextApiRequest, NextApiResponse } from 'next';
import { AccessToken, AccessTokenOptions, VideoGrant, AgentDispatchClient } from "livekit-server-sdk";

// Environment variables
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!LIVEKIT_URL) {
      throw new Error("LIVEKIT_URL is not defined");
    }
    if (!API_KEY) {
      throw new Error("LIVEKIT_API_KEY is not defined");
    }
    if (!API_SECRET) {
      throw new Error("LIVEKIT_API_SECRET is not defined");
    }

    // Get workflow data from request body
    const { workflowId, workflowJson } = req.body;

    if (!workflowId) {
      return res.status(400).json({ error: 'workflowId is required' });
    }

    // Generate room information
    const roomName = `workflow_room_${workflowId}_${Math.floor(Math.random() * 10_000)}`;
    const agentName = `utter-telephony-agent`;
    
    // Generate participant token for user
    const participantIdentity = `workflow_user_${workflowId}_${Math.floor(Math.random() * 10_000)}`;
    const participantToken = await createParticipantToken(
      { identity: participantIdentity },
      roomName
    );

    // Dispatch agent to the room
    const agentDispatchClient = new AgentDispatchClient(
      LIVEKIT_URL, 
      API_KEY, 
      API_SECRET
    );
    workflowJson["call_type"] = "runworkflow";
    // Create a dispatch request with workflow data as metadata
    const metadata = JSON.stringify({
      "phone_number": "1234567890",
      "sip_trunk_id": "1234567890",
      "agentic_workflow": workflowJson,
    });
    // phone_number = dial_info["phone_number"]
    // sip_trunk_id = dial_info["sip_trunk_id"]
    // agentic_workflow = dial_info["agentic_workflow"]

    const dispatch = await agentDispatchClient.createDispatch(roomName, agentName, {
      metadata: metadata,
    });

    console.log('Created agent dispatch:', dispatch);

    // Return connection details for the frontend
    return res.status(200).json({
      status: 'success',
      message: 'Agent dispatched successfully',
      serverUrl: LIVEKIT_URL,
      roomName: roomName,
      participantToken: participantToken,
      participantName: participantIdentity,
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Unknown error' });
  }
}

function createParticipantToken(userInfo: AccessTokenOptions, roomName: string) {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: "15m",
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);
  return at.toJwt();
} 