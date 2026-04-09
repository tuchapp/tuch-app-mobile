/**
 * V2 Agent initialization — generates and persists the local agent UUID.
 * The agent_id is the only identifier that reaches the backend.
 */

import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';
import type { AgentRegisterResponse } from '../api/types';

const AGENT_ID_KEY = 'v2_agent_id';
const REGISTERED_KEY = 'v2_agent_registered';

/**
 * Generate a new RFC-4122 UUID v4.
 * Uses the Web Crypto API which is available in Expo's JS runtime.
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get the agent UUID, generating and persisting it if it doesn't exist.
 */
export async function getAgentId(): Promise<string> {
  let id = await SecureStore.getItemAsync(AGENT_ID_KEY);
  if (!id) {
    id = generateUUID();
    await SecureStore.setItemAsync(AGENT_ID_KEY, id);
  }
  return id;
}

/**
 * Generate a new agent ID (replaces existing — use only for account reset).
 */
export async function generateAgentId(): Promise<string> {
  const id = generateUUID();
  await SecureStore.setItemAsync(AGENT_ID_KEY, id);
  await SecureStore.deleteItemAsync(REGISTERED_KEY);
  return id;
}

/**
 * Whether the agent has been registered with the backend.
 */
export async function isRegistered(): Promise<boolean> {
  const flag = await SecureStore.getItemAsync(REGISTERED_KEY);
  return flag === 'true';
}

/**
 * Register the agent with the backend.
 * @param stripeCustomerId Stripe customer ID (from IAP or web billing).
 */
export async function registerWithBackend(
  stripeCustomerId: string
): Promise<AgentRegisterResponse> {
  const agentId = await getAgentId();

  const response = await apiClient.post<AgentRegisterResponse>('/agents/register', {
    agent_id: agentId,
    stripe_customer_id: stripeCustomerId,
    tier: 'standard',
  });

  await SecureStore.setItemAsync(REGISTERED_KEY, 'true');
  return response;
}
