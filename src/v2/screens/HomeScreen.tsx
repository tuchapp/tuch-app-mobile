/**
 * V2 HomeScreen — Agent dashboard.
 * Shows greeting, dominant state summary, pending coach prompt, and quick actions.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useAgent } from '../context/AgentContext';
import { useDatabase } from '../context/DatabaseContext';
import { getGreeting } from '../agent/personality';

const STATE_COPY: Record<string, { label: string; description: string; color: string }> = {
  stress_rising: {
    label: 'Feeling the pressure',
    description: "You seem to have a lot on your plate. Let's take it one step at a time.",
    color: '#E07070',
  },
  disengaging: {
    label: 'Drifting a little',
    description: "It's okay. Coming back is what matters — even a small action counts.",
    color: '#B8A0D0',
  },
  quietly_drifting: {
    label: 'Momentum has slowed',
    description: "Your goals are waiting. A quick update could get things moving again.",
    color: '#D0A060',
  },
  recovering: {
    label: 'Getting back on track',
    description: "You've been bouncing back. Keep that going — you're building something real.",
    color: '#70B890',
  },
  building_momentum: {
    label: 'Building momentum',
    description: "You've been consistent lately. This is what progress feels like.",
    color: '#5BA8C4',
  },
  stable: {
    label: 'Steady',
    description: "Things look balanced. A good time to reflect or push a goal forward.",
    color: '#7A9E7E',
  },
};

export default function HomeScreen({ navigation }: any) {
  const { profile, signals, personality, isReady } = useAgent();
  const { goals } = useDatabase();
  const [focusGoal, setFocusGoal] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await goals.findAll();
        const active = all.filter((g: any) => g.status === 'active' || g.status === 'in_progress');
        if (active.length > 0) {
          // Pick highest priority or lowest progress as focus
          const sorted = active.sort((a: any, b: any) => a.progress_percent - b.progress_percent);
          setFocusGoal(sorted[0]);
        }
      } catch (_) {}
    })();
  }, [goals]);

  if (!isReady) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#5BA8C4" />
      </SafeAreaView>
    );
  }

  const agentName = profile?.agent_name ?? 'Your Agent';
  const greeting = getGreeting(agentName, personality);
  const stateInfo = STATE_COPY[signals.dominant_state] ?? STATE_COPY.stable;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Greeting */}
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.subGreeting}>Here's how things look today</Text>

        {/* Dominant state card */}
        <View style={[styles.stateCard, { borderLeftColor: stateInfo.color }]}>
          <Text style={[styles.stateLabel, { color: stateInfo.color }]}>{stateInfo.label}</Text>
          <Text style={styles.stateDescription}>{stateInfo.description}</Text>
        </View>

        {/* Focus goal */}
        {focusGoal && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's focus</Text>
            <TouchableOpacity
              style={styles.goalCard}
              onPress={() => navigation?.navigate?.('Goals')}
              accessibilityLabel={`Focus goal: ${focusGoal.title}`}
            >
              <Text style={styles.goalTitle}>{focusGoal.title}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${focusGoal.progress_percent ?? 0}%` }]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(focusGoal.progress_percent ?? 0)}% complete
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation?.navigate?.('Reflect')}
              accessibilityLabel="Log mood"
            >
              <Text style={styles.quickBtnText}>Log Mood</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation?.navigate?.('Goals')}
              accessibilityLabel="Update a goal"
            >
              <Text style={styles.quickBtnText}>Update Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation?.navigate?.('Coach')}
              accessibilityLabel="Start a chat"
            >
              <Text style={styles.quickBtnText}>Start Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAF8' },
  content: { padding: 24, paddingBottom: 40 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  subGreeting: { fontSize: 14, color: '#666', marginBottom: 24 },
  stateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  stateLabel: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  stateDescription: { fontSize: 14, color: '#444', lineHeight: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#888', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },
  goalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  goalTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 10 },
  progressBar: { height: 6, backgroundColor: '#E8E8E8', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#5BA8C4', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#888' },
  quickActions: { flexDirection: 'row', gap: 10 },
  quickBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  quickBtnText: { fontSize: 13, fontWeight: '600', color: '#5BA8C4' },
});
