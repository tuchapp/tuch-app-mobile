/**
 * AgentContext — loads agent profile, last signals, and dominant state.
 * Exposes agent-level state to the component tree.
 */
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useDatabase } from './DatabaseContext';
import { apiClient } from '../api/client';
import { AgentPersonality, getPersonality } from '../agent/personality';

export interface AgentProfile {
  agent_id: string;
  agent_name: string;
  timezone: string;
  coaching_tone: string;
  personality_id: string;
  preferred_message_length: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignalState {
  dominant_state: string;
  consistency_score: number;
  goal_drift_score: number;
  stress_escalation_score: number;
  disengagement_risk_score: number;
  recovery_score: number;
  computed_at: string | null;
}

const DEFAULT_SIGNALS: SignalState = {
  dominant_state: 'stable',
  consistency_score: 50,
  goal_drift_score: 0,
  stress_escalation_score: 0,
  disengagement_risk_score: 0,
  recovery_score: 50,
  computed_at: null,
};

interface AgentContextValue {
  profile: AgentProfile | null;
  signals: SignalState;
  personality: AgentPersonality;
  lastSignalRefresh: Date | null;
  isReady: boolean;
  refreshSignals: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AgentContext = createContext<AgentContextValue | null>(null);

const SIGNAL_REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

export function AgentProvider({ children }: { children: ReactNode }) {
  const { agentProfile } = useDatabase();
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [signals, setSignals] = useState<SignalState>(DEFAULT_SIGNALS);
  const [lastSignalRefresh, setLastSignalRefresh] = useState<Date | null>(null);
  const [isReady, setIsReady] = useState(false);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const p = await agentProfile.get();
      setProfile(p as AgentProfile | null);
    } catch (e) {
      console.warn('[AgentContext] refreshProfile error', e);
    }
  }, [agentProfile]);

  const refreshSignals = useCallback(async () => {
    try {
      const res = await apiClient.get('/agent/signals');
      if (res?.data) {
        const d = res.data;
        setSignals({
          dominant_state: d.dominant_state ?? 'stable',
          consistency_score: d.signals?.consistency_score ?? 50,
          goal_drift_score: d.signals?.goal_drift_score ?? 0,
          stress_escalation_score: d.signals?.stress_escalation_score ?? 0,
          disengagement_risk_score: d.signals?.disengagement_risk_score ?? 0,
          recovery_score: d.signals?.recovery_score ?? 50,
          computed_at: d.computed_at ?? null,
        });
        setLastSignalRefresh(new Date());
      }
    } catch (e) {
      // Offline or not registered yet — keep last known signals silently
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshProfile();
      await refreshSignals();
      setIsReady(true);
    })();

    // Auto-refresh signals every 4 hours in the background
    refreshIntervalRef.current = setInterval(() => {
      refreshSignals();
    }, SIGNAL_REFRESH_INTERVAL_MS);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshProfile, refreshSignals]);

  const personality = getPersonality(profile?.personality_id);

  return (
    <AgentContext.Provider value={{ profile, signals, personality, lastSignalRefresh, isReady, refreshSignals, refreshProfile }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used within AgentProvider');
  return ctx;
}
