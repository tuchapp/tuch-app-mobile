/**
 * DatabaseContext — opens the on-device SQLite DB, runs migrations,
 * and exposes typed repositories to the component tree.
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { initDatabase, getDatabase } from '../db';
import { GoalsRepository } from '../db/repositories/goals';
import { JournalRepository } from '../db/repositories/journal';
import { MoodRepository } from '../db/repositories/mood';
import { ConversationRepository } from '../db/repositories/conversation';
import { EventRepository } from '../db/repositories/events';
import { MemoryRepository } from '../db/repositories/memory';
import { AgentProfileRepository } from '../db/repositories/agent-profile';

interface Repositories {
  goals: GoalsRepository;
  journal: JournalRepository;
  mood: MoodRepository;
  conversation: ConversationRepository;
  events: EventRepository;
  memory: MemoryRepository;
  agentProfile: AgentProfileRepository;
}

const DatabaseContext = createContext<Repositories | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [repos, setRepos] = useState<Repositories | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        const db = getDatabase();
        setRepos({
          goals: new GoalsRepository(db),
          journal: new JournalRepository(db),
          mood: new MoodRepository(db),
          conversation: new ConversationRepository(db),
          events: new EventRepository(db),
          memory: new MemoryRepository(db),
          agentProfile: new AgentProfileRepository(db),
        });
      } catch (e: any) {
        setError(e?.message ?? 'Database init failed');
      }
    })();
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#c00' }}>Database error: {error}</Text>
      </View>
    );
  }

  if (!repos) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <DatabaseContext.Provider value={repos}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): Repositories {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase must be used within DatabaseProvider');
  return ctx;
}
