/**
 * V2 YouScreen — Agent profile, settings, privacy controls, subscription.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, TextInput, Switch, Alert,
} from 'react-native';
import { useAgent } from '../context/AgentContext';
import { useDatabase } from '../context/DatabaseContext';
import { apiClient } from '../api/client';

const TONES = ['supportive', 'structured', 'direct', 'reflective'];

export default function YouScreen() {
  const { profile, refreshProfile } = useAgent();
  const { agentProfile } = useDatabase();

  const [agentName, setAgentName] = useState(profile?.agent_name ?? '');
  const [selectedTone, setSelectedTone] = useState(profile?.coaching_tone ?? 'supportive');
  const [quietStart, setQuietStart] = useState(profile?.quiet_hours_start ?? '21:00');
  const [quietEnd, setQuietEnd] = useState(profile?.quiet_hours_end ?? '07:00');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [memoryCount, setMemoryCount] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAgentName(profile?.agent_name ?? '');
    setSelectedTone(profile?.coaching_tone ?? 'supportive');
    setQuietStart(profile?.quiet_hours_start ?? '21:00');
    setQuietEnd(profile?.quiet_hours_end ?? '07:00');
  }, [profile]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/web/agent/overview');
        setMemoryCount(res?.data?.memory_record_count ?? null);
      } catch (_) {}
    })();
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await agentProfile.upsert({
        agent_name: agentName.trim(),
        coaching_tone: selectedTone,
        quiet_hours_start: quietStart,
        quiet_hours_end: quietEnd,
        updated_at: new Date().toISOString(),
      });
      await apiClient.patch('/agent/preferences', {
        coaching_tone: selectedTone,
        quiet_hours_start: quietStart,
        quiet_hours_end: quietEnd,
        sms_enabled: smsEnabled,
        email_enabled: emailEnabled,
      });
      await refreshProfile();
      Alert.alert('Saved', 'Your preferences have been updated.');
    } catch (_) {
      Alert.alert('Error', 'Could not save preferences. Try again.');
    }
    setIsSaving(false);
  };

  const handleViewMemory = async () => {
    try {
      const res = await apiClient.get('/web/agent/memory');
      const patterns = res?.data ?? [];
      const summary = patterns.map((p: any) => `• ${p.pattern_key} (${p.pattern_value?.trend ?? 'n/a'})`).join('\n');
      Alert.alert('Backend Memory', summary || 'No patterns synced yet.', [{ text: 'OK' }]);
    } catch (_) {
      Alert.alert('Error', 'Could not fetch memory records.');
    }
  };

  const handleDeleteAllMemory = () => {
    Alert.alert(
      'Delete all backend memory?',
      'This removes all behavioral patterns stored on the server. Your on-device data is not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.del('/agent/memory');
              setMemoryCount(0);
              Alert.alert('Done', 'All backend memory deleted.');
            } catch (_) {
              Alert.alert('Error', 'Could not delete memory.');
            }
          },
        },
      ]
    );
  };

  const handleBillingPortal = async () => {
    try {
      const res = await apiClient.get('/web/billing/portal-url');
      const url = res?.data?.portal_url;
      if (url) {
        const { Linking } = require('react-native');
        Linking.openURL(url);
      }
    } catch (_) {
      Alert.alert('Error', 'Could not open billing portal.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>You</Text>

        {/* Agent profile */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Agent profile</Text>
          <Text style={styles.fieldLabel}>Agent name</Text>
          <TextInput
            style={styles.input}
            value={agentName}
            onChangeText={setAgentName}
            placeholder="Name your agent"
            accessibilityLabel="Agent name"
          />
          <Text style={styles.fieldLabel}>Coaching tone</Text>
          <View style={styles.toneRow}>
            {TONES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.toneBtn, selectedTone === t && styles.toneBtnActive]}
                onPress={() => setSelectedTone(t)}
                accessibilityLabel={`${t} tone`}
              >
                <Text style={[styles.toneBtnText, selectedTone === t && styles.toneBtnTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notifications</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email notifications</Text>
            <Switch value={emailEnabled} onValueChange={setEmailEnabled} trackColor={{ true: '#5BA8C4' }} />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>SMS notifications</Text>
            <Switch value={smsEnabled} onValueChange={setSmsEnabled} trackColor={{ true: '#5BA8C4' }} />
          </View>
          <Text style={styles.fieldLabel}>Quiet hours</Text>
          <View style={styles.quietRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.quietLabel}>From</Text>
              <TextInput style={styles.input} value={quietStart} onChangeText={setQuietStart} placeholder="21:00" accessibilityLabel="Quiet hours start" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.quietLabel}>Until</Text>
              <TextInput style={styles.input} value={quietEnd} onChangeText={setQuietEnd} placeholder="07:00" accessibilityLabel="Quiet hours end" />
            </View>
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Privacy</Text>
          <Text style={styles.privacyNote}>
            Your goals, journals, moods, and conversations never leave your device.
            Only anonymized behavioral patterns are stored on our servers.
          </Text>
          {memoryCount !== null && (
            <Text style={styles.memoryCount}>{memoryCount} pattern{memoryCount !== 1 ? 's' : ''} stored on server</Text>
          )}
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleViewMemory} accessibilityLabel="View backend memory">
            <Text style={styles.secondaryBtnText}>View synced patterns</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAllMemory} accessibilityLabel="Delete all backend memory">
            <Text style={styles.dangerBtnText}>Delete all backend memory</Text>
          </TouchableOpacity>
        </View>

        {/* Subscription */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subscription</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleBillingPortal} accessibilityLabel="Manage subscription">
            <Text style={styles.secondaryBtnText}>Manage subscription</Text>
          </TouchableOpacity>
        </View>

        {/* Save */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={isSaving} accessibilityLabel="Save preferences">
          <Text style={styles.saveBtnText}>{isSaving ? 'Saving…' : 'Save preferences'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#E8E8E8' },
  toneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  toneBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0' },
  toneBtnActive: { backgroundColor: '#5BA8C4' },
  toneBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  toneBtnTextActive: { color: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  rowLabel: { fontSize: 15, color: '#333' },
  quietRow: { flexDirection: 'row', gap: 0, marginTop: 4 },
  quietLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  privacyNote: { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 12 },
  memoryCount: { fontSize: 13, color: '#888', marginBottom: 10 },
  secondaryBtn: { backgroundColor: '#F0F0F0', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: '#5BA8C4' },
  dangerBtn: { backgroundColor: '#FFF0F0', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  dangerBtnText: { fontSize: 14, fontWeight: '600', color: '#D04040' },
  saveBtn: { backgroundColor: '#5BA8C4', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
