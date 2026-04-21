// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Honeypot {
  id: string;
  name: string;
  type: string;
  ip_address: string;
  port: string;
  status: string;
  emulated_system?: string;
  description?: string;
  attack_count: number;
  created_at: string;
  container_id?: string;
  mapped_port?: string;
}

export interface CreateHoneypotDto {
  name: string;
  type: string;
  ip_address: string;
  port: string;
  emulated_system?: string;
  description?: string;
}

export interface Attack {
  id: string;
  honeypot_id: string;
  timestamp: string;
  source_ip: string;
  attack_type: string;
  username?: string;
  password?: string;
  details: any;
}

export interface AttackList {
  attacks: Attack[];
}

export interface AttackStats {
  total: number;
  by_type: Record<string, number>;
  by_honeypot: Record<string, number>;
  daily: Record<string, number>;
}

let wsConnection: WebSocket | null = null;
let wsCallbacks: ((attack: Attack) => void)[] = [];

// Helper function to handle API errors
async function handleResponse(response: Response) {
  if (!response.ok) {
    let errorMessage = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch (e) {
      // Ignore JSON parsing errors
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

// Honeypot CRUD operations
export async function getAllHoneypots(): Promise<Honeypot[]> {
  const response = await fetch(`${API_BASE_URL}/honeypots`);
  return handleResponse(response);
}

export async function getHoneypotById(id: string): Promise<Honeypot> {
  const response = await fetch(`${API_BASE_URL}/honeypots/${id}`);
  return handleResponse(response);
}

export async function createHoneypot(data: CreateHoneypotDto): Promise<Honeypot> {
  const response = await fetch(`${API_BASE_URL}/honeypots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(response);
}

export async function deployHoneypot(id: string): Promise<Honeypot> {
  const response = await fetch(`${API_BASE_URL}/honeypots/${id}/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse(response);
}

export async function deleteHoneypot(id: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/honeypots/${id}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error(`Failed to delete honeypot: ${response.statusText}`);
  }

  return true;
}

// Attack operations
export async function getHoneypotAttacks(id: string, limit = 20, offset = 0): Promise<AttackList> {
  const response = await fetch(`${API_BASE_URL}/honeypots/${id}/attacks?limit=${limit}&offset=${offset}`);
  return handleResponse(response);
}

export async function getAllAttacks(limit = 20, offset = 0): Promise<AttackList> {
  const response = await fetch(`${API_BASE_URL}/attacks?limit=${limit}&offset=${offset}`);
  return handleResponse(response);
}

export async function getAttackStats(days = 7): Promise<AttackStats> {
  const response = await fetch(`${API_BASE_URL}/attacks/stats?days=${days}`);
  return handleResponse(response);
}

// WebSocket connection for real-time attack notifications
export function subscribeToAttacks(callback: (attack: Attack) => void): () => void {
  // Add callback to the list
  wsCallbacks.push(callback);

  // Create WebSocket connection if it doesn't exist
  if (!wsConnection) {
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws/attacks';
    wsConnection = new WebSocket(wsUrl);

    wsConnection.onmessage = (event) => {
      try {
        const attack = JSON.parse(event.data) as Attack;
        // Call all registered callbacks
        wsCallbacks.forEach(cb => cb(attack));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    wsConnection.onclose = () => {
      // Try to reconnect after a delay
      setTimeout(() => {
        wsConnection = null;
        if (wsCallbacks.length > 0) {
          subscribeToAttacks(() => { });
        }
      }, 5000);
    };

    // Keep connection alive
    const pingInterval = setInterval(() => {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send('ping');
      } else if (!wsConnection || wsConnection.readyState === WebSocket.CLOSED) {
        clearInterval(pingInterval);
      }
    }, 30000);
  }

  // Return unsubscribe function
  return () => {
    wsCallbacks = wsCallbacks.filter(cb => cb !== callback);

    // Close connection if no more callbacks
    if (wsCallbacks.length === 0 && wsConnection) {
      wsConnection.close();
      wsConnection = null;
    }
  };
}

// Recover honeypots after server restart
export async function recoverHoneypots(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/recover`, {
    method: 'POST'
  });
  return handleResponse(response);
}

export async function getAttacks(limit = 50, offset = 0, honeypotId?: string) {
  const url = honeypotId
    ? `/honeypots/${honeypotId}/attacks?limit=${limit}&offset=${offset}`
    : `/attacks?limit=${limit}&offset=${offset}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch attacks: ${response.statusText}`);
  }

  return response.json();
}