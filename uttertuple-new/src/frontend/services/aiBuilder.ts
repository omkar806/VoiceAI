import { safeStorage } from '@/lib/safeStorage';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SSEEvent {
  type: 'message' | 'tool_call' | 'tool_result' | 'agent_created' | 'error' | 'done';
  content?: string;
  tool_name?: string;
  tool_args?: Record<string, any>;
  result?: string;
  agent_id?: string;
  agent_name?: string;
}

export interface LLMProvider {
  id: string;
  provider_name: string;
  model_name: string | null;
}

/**
 * Send a chat message to the AI Builder backend and handle the SSE stream.
 * 
 * @param messages - Array of chat messages (conversation history)
 * @param llmProviderId - UUID of the user's LLM provider to use
 * @param onEvent - Callback for each SSE event received
 * @param signal - Optional AbortSignal for cancellation
 */
export async function streamChat(
  messages: ChatMessage[],
  llmProviderId: string,
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  // Get auth credentials from localStorage (same pattern as apiConfig.ts)
  const token = safeStorage.getItem('access_token');
  const organizationId = safeStorage.getItem('current_organization');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (organizationId) {
    headers['X-Organization-ID'] = organizationId;
  }

  const response = await fetch('/api/ai-builder', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages,
      llm_provider_id: llmProviderId,
      mode: 'agent',
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Builder request failed: ${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE events from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const event: SSEEvent = JSON.parse(jsonStr);
            onEvent(event);
            
            if (event.type === 'done') {
              return;
            }
          } catch (e) {
            console.warn('Failed to parse SSE event:', jsonStr);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

const aiBuilderService = {
  streamChat,
};

export default aiBuilderService;
