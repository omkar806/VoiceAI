import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL_DEV || 'http://localhost:8020/api/v1';

/**
 * Next.js API route that proxies chat requests to the FastAPI backend.
 * Handles SSE streaming passthrough from backend to frontend.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward auth headers from the incoming request
    const authHeader = request.headers.get('Authorization');
    const orgId = request.headers.get('X-Organization-ID');

    // Also check cookies/query for auth tokens (the frontend apiConfig adds these)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    if (orgId) {
      headers['X-Organization-ID'] = orgId;
    }

    // Build the URL with organization_id as query param (matching the backend pattern)
    let backendUrl = `${BACKEND_URL}/ai-builder/chat`;
    if (orgId) {
      backendUrl += `?organization_id=${orgId}`;
    }

    // Forward the request to the backend
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return new Response(
        JSON.stringify({ error: `Backend error: ${backendResponse.status}`, detail: errorText }),
        { status: backendResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream the SSE response back to the frontend
    const stream = backendResponse.body;
    if (!stream) {
      return new Response(
        JSON.stringify({ error: 'No response body from backend' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: any) {
    console.error('AI Builder proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal proxy error', detail: error?.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
