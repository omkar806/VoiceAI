"use client";

import { useCallback, useEffect, useState, useRef, useContext } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Room, RoomEvent } from "livekit-client";
import {
  BarVisualizer,
  DisconnectButton,
  RoomAudioRenderer,
  RoomContext,
  VideoTrack,
  VoiceAssistantControlBar,
  useVoiceAssistant,
} from "@livekit/components-react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { toast } from "react-hot-toast";
import MainLayout from "@/components/layout/MainLayout";
import type { ConnectionDetails } from "@/app/api/connection-details";
import useCombinedTranscriptions from "@/hooks/useCombinedTranscriptions";
import workflowService from "@/services/workflow";
import { useTheme } from "@/contexts/ThemeContext";
import { getWorkflowJson, clearWorkflowJson } from "@/utils/workflowStorage";

// Use the CloseIcon component locally
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3.33398 3.33334L12.6673 12.6667M12.6673 3.33334L3.33398 12.6667"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  );
}

// Use NoAgentNotification locally
function NoAgentNotification(props: { state: string }) {
  const timeToWaitMs = 10_000;
  const timeoutRef = useRef<number | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const agentHasConnected = useRef(false);
  const { darkMode } = useTheme();

  // If the agent has connected, we don't need to show the notification.
  if (
    ["listening", "thinking", "speaking"].includes(props.state) &&
    agentHasConnected.current == false
  ) {
    agentHasConnected.current = true;
  }

  useEffect(() => {
    if (props.state === "connecting") {
      timeoutRef.current = window.setTimeout(() => {
        if (props.state === "connecting" && agentHasConnected.current === false) {
          setShowNotification(true);
        }
      }, timeToWaitMs);
    } else {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      setShowNotification(false);
    }

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [props.state]);

  return (
    <>
      {showNotification ? (
        <div className={`fixed text-sm left-1/2 max-w-[90vw] -translate-x-1/2 flex top-6 items-center gap-4 ${darkMode ? 'bg-[#1F1F1F] text-white' : 'bg-gray-100 text-gray-800'} px-4 py-3 rounded-lg`}>
          <div>
            {/* Warning Icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9.85068 3.63564C10.8197 2.00589 13.1793 2.00589 14.1484 3.63564L21.6323 16.2223C22.6232 17.8888 21.4223 20 19.4835 20H4.51555C2.57676 20 1.37584 17.8888 2.36671 16.2223L9.85068 3.63564ZM12 8.5C12.2761 8.5 12.5 8.72386 12.5 9V13.5C12.5 13.7761 12.2761 14 12 14C11.7239 14 11.5 13.7761 11.5 13.5V9C11.5 8.72386 11.7239 8.5 12 8.5ZM12.75 16C12.75 16.4142 12.4142 16.75 12 16.75C11.5858 16.75 11.25 16.4142 11.25 16C11.25 15.5858 11.5858 15.25 12 15.25C12.4142 15.25 12.75 15.5858 12.75 16Z"
                fill={darkMode ? "#666666" : "#888888"}
              />
            </svg>
          </div>
          <p className="text-pretty w-max">
            It&apos;s quiet... too quiet. Is your agent lost? Ensure your agent is properly
            configured and running on your machine.
          </p>
          <a
            href="https://docs.livekit.io/agents/quickstarts/s2s/"
            target="_blank"
            className="underline whitespace-nowrap"
          >
            View guide
          </a>
          <button onClick={() => setShowNotification(false)}>
            {/* Close Icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3.16602 3.16666L12.8327 12.8333M12.8327 3.16666L3.16602 12.8333"
                stroke={darkMode ? "#999999" : "#666666"}
                strokeWidth="1.5"
                strokeLinecap="square"
              />
            </svg>
          </button>
        </div>
      ) : null}
    </>
  );
}

// Use TranscriptionView locally
function TranscriptionView() {
  const combinedTranscriptions = useCombinedTranscriptions();
  const containerRef = useRef<HTMLDivElement>(null);
  const { darkMode } = useTheme();

  // scroll to bottom when new transcription is added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [combinedTranscriptions]);

  return (
    <div className="relative h-full w-full max-w-[90vw] mx-auto">
      {/* Fade-out gradient mask */}
      <div className={`absolute top-0 left-0 right-0 h-8 bg-gradient-to-b ${darkMode ? 'from-[var(--lk-bg)]' : 'from-white'} to-transparent z-10 pointer-events-none`} />
      <div className={`absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t ${darkMode ? 'from-[var(--lk-bg)]' : 'from-white'} to-transparent z-10 pointer-events-none`} />

      {/* Scrollable content */}
      <div ref={containerRef} className="h-full flex flex-col gap-4 overflow-y-auto px-4 py-8">
        {combinedTranscriptions.map((segment) => (
          <div
            id={segment.id}
            key={segment.id}
            className={
              segment.role === "assistant"
                ? `p-3 self-start max-w-[80%] flex items-start gap-3 ${darkMode ? '' : 'text-gray-800'}`
                : `p-3 self-end max-w-[80%] flex items-start gap-3 flex-row-reverse ${darkMode ? '' : 'text-gray-800'}`
            }
          >
            {segment.role === "assistant" ? (
              <div className={`min-w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-primary-600' : 'bg-primary-500'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Z"/>
                  <circle cx="12" cy="9" r="1"/>
                  <circle cx="9" cy="12" r="1"/>
                  <circle cx="15" cy="12" r="1"/>
                  <path d="M9 15c.6.613 1.556 1 3 1s2.4-.387 3-1"/>
                </svg>
              </div>
            ) : (
              <div className={`min-w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={darkMode ? "white" : "black"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 20a6 6 0 0 0-12 0"/>
                  <circle cx="12" cy="10" r="4"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
            )}
            <div className={`${segment.role === "assistant" ? "" : `${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-md p-2`}`}>
              {segment.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RunWorkflowPageProps {
  id?: string;
}

export default function RunWorkflowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workflowId = searchParams.get('workflowId');
  const [workflowJson, setWorkflowJson] = useState<any>(null);
  const [room] = useState(new Room());
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState<string | null>(null);
  const { darkMode } = useTheme();

  // Fetch workflow name and JSON when workflowId is available
  useEffect(() => {
    async function fetchWorkflowDetails() {
      if (workflowId && typeof workflowId === 'string') {
        try {
          // Fetch workflow details including name
          const workflow = await workflowService.getWorkflowById(workflowId);
          setWorkflowName(workflow.name);
          
          // Try to get the workflow JSON from session storage
          const storedJson = getWorkflowJson(workflowId);
          if (storedJson) {
            setWorkflowJson(storedJson);
            // Clear the workflow JSON from session storage after retrieving it
            // This ensures it can't be accessed again after this point
            clearWorkflowJson(workflowId);
          }
        } catch (err) {
          console.error('Error fetching workflow details:', err);
        }
      }
    }
    
    fetchWorkflowDetails();
  }, [workflowId]);

  const onConnectButtonClicked = useCallback(async () => {
    if (!workflowId) {
      toast.error('Workflow ID is required');
      return;
    }

    setLoading(true);
    try {
      // Execute the workflow via our service, using the workflow JSON from state
      // If not available in state, it will be regenerated on the server
      const connectionDetails = await workflowService.executeWorkflow(
        workflowId as string, 
        workflowJson
      );

      // Connect to the LiveKit room
      await room.connect(connectionDetails.serverUrl, connectionDetails.participantToken);
      await room.localParticipant.setMicrophoneEnabled(true);
      setIsConnected(true);
    } catch (error) {
      console.error('Error connecting to room:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [room, workflowId, workflowJson]);

  useEffect(() => {
    room.on(RoomEvent.MediaDevicesError, onDeviceFailure);

    return () => {
      room.off(RoomEvent.MediaDevicesError, onDeviceFailure);
      if (room.state === 'connected') {
        room.disconnect();
      }
    };
  }, [room]);

  function onDeviceFailure(error: Error) {
    console.error(error);
    toast.error(
      "Error acquiring camera or microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
    );
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
          {/* workflows/create?id=09c9f77f-9092-4e6a-9b89-bfa9dc36946b */}
            <Link href={`/workflows/${workflowId}/edit`}>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Workflow
              </Button>
            </Link>
            <h1 className="text-xl font-medium">
              {workflowName ? `Run ${workflowName}` : 'Run Workflow'}
            </h1>
          </div>
        </div>

        <div className="h-full flex-1 overflow-hidden relative" data-lk-theme={darkMode ? "default" : "light"}>
          <RoomContext.Provider value={room}>
            <div className="lk-room-container max-w-[1024px] w-full mx-auto h-full">
              <SimpleVoiceAssistant 
                onConnectButtonClicked={onConnectButtonClicked} 
                isConnected={isConnected} 
              />
            </div>
          </RoomContext.Provider>
        </div>
      </div>
    </MainLayout>
  );
}

function SimpleVoiceAssistant(props: { 
  onConnectButtonClicked: () => void;
  isConnected: boolean;
}) {
  const { state: agentState } = useVoiceAssistant();
  const { darkMode } = useTheme();

  return (
    <>
      <AnimatePresence mode="wait">
        {agentState === "disconnected" ? (
          <motion.div
            key="disconnected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.09, 1.04, 0.245, 1.055] }}
            className={`grid items-center justify-center h-[400px] ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} rounded-lg`}
          >
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="uppercase px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-all"
              onClick={() => props.onConnectButtonClicked()}
            >
              Start a conversation
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="connected"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.09, 1.04, 0.245, 1.055] }}
            className="flex flex-col h-full relative"
          >
            <AgentVisualizer />
            <div className="flex-1 w-full overflow-hidden pb-24">
              <TranscriptionView />
            </div>
            <div className="w-full fixed bottom-0 left-0 right-0 z-20 flex justify-center pb-6 pt-2">
              <ControlBar />
            </div>
            <RoomAudioRenderer />
            <NoAgentNotification state={agentState} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function AgentVisualizer() {
  const { state: agentState, videoTrack, audioTrack } = useVoiceAssistant();

  if (videoTrack) {
    return (
      <div className="h-[200px] w-full max-w-[512px] mx-auto rounded-lg overflow-hidden mb-4">
        <VideoTrack trackRef={videoTrack} />
      </div>
    );
  }
  return (
    <div className="h-[150px] w-full max-w-[800px] mx-auto mb-4">
      <BarVisualizer
        state={agentState}
        barCount={5}
        trackRef={audioTrack}
        className="agent-visualizer"
        options={{ minHeight: 24 }}
      />
    </div>
  );
}

function ControlBar() {
  const { state: agentState } = useVoiceAssistant();
  const [micEnabled, setMicEnabled] = useState(true);
  const room = useContext(RoomContext);
  const { darkMode } = useTheme();

  const toggleMicrophone = async () => {
    if (room && room.localParticipant) {
      const newState = !micEnabled;
      await room.localParticipant.setMicrophoneEnabled(newState);
      setMicEnabled(newState);
    }
  };

  const handleDisconnect = async () => {
    // Handle disconnection
    window.location.reload();
  };

  return (
    <div className={`${darkMode ? 'bg-gray-900/30' : 'bg-white/30'} backdrop-blur-md rounded-full shadow-lg`}>
      <AnimatePresence>
        {agentState !== "disconnected" && agentState !== "connecting" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.09, 1.04, 0.245, 1.055] }}
            className={`flex h-16 justify-center items-center gap-6 py-3 px-6`}
          >
            <button 
              onClick={toggleMicrophone} 
              className={`p-3 rounded-full ${
                micEnabled 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-700 text-gray-300'
              }`}
              aria-label={micEnabled ? 'Microphone On' : 'Microphone Off'}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                {micEnabled ? (
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8"/>
                ) : (
                  <path d="M1 1l22 22 M9 9v3a3 3 0 0 0 5.12 2.12L9 9z M15 9.34V4a3 3 0 0 0-5.94-.6 M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23 M12 19v4 M8 23h8"/>
                )}
              </svg>
            </button>
            <button 
              onClick={handleDisconnect} 
              className="p-3 bg-red-500 text-white rounded-full"
              aria-label="Disconnect"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18 M6 6l12 12"/>
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 