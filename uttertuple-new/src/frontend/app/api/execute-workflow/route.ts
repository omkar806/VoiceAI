import { NextRequest, NextResponse } from 'next/server';
import { AccessToken, AccessTokenOptions, VideoGrant, AgentDispatchClient } from "livekit-server-sdk";

// Environment variables
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { workflowId, workflowJson } = body;

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
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
    
    // Set call type
    const workflowData = workflowJson ? { ...workflowJson } : {};
    workflowData["call_type"] = "runworkflow";
    
    // Create a dispatch request with workflow data as metadata
    const metadata = JSON.stringify({
      "phone_number": "1234567890",
      "sip_trunk_id": "1234567890",
      "agentic_workflow": workflowData,
    });

    const dispatch = await agentDispatchClient.createDispatch(roomName, agentName, {
      metadata: metadata,
    });

    console.log('Created agent dispatch:', dispatch);

    // Return connection details for the frontend
    return NextResponse.json({
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
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