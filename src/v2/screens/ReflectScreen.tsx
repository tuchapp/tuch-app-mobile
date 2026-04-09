/**
 * V2 ReflectScreen — Journal entries and mood logging.
 * All data stays on device. Never synced to backend in raw form.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useDatabase } from '../context/DatabaseContext';
import { useAgent } from '../context/AgentContext';
import { voiceService } from '../voice/voice_service';

type Tab = 'journal' | 'mood';

export default function ReflectScreen() {
  const { journal, mood } = useDatabase();
  const { profile } = useAgent();
  const [tab, setTab] = useState<Tab>('journal');

  // Journal state
  const [journalText, setJournalText] = useState('');
  const [journalTitle, setJournalTitle] = useState('');
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  // Mood state
  const [moodVal, setMoodVal] = useState(3);
  const [energyVal, setEnergyVal] = useState(3);
  const [stressVal, setStressVal] = useState(3);
  const [moodNote, setMoodNote] = useState('');
  const [moodLogs, setMoodLogs] = useState<any[]>([]);

  const loadJournal = useCallback(async () => {
    try {
      const entries = await journal.findAll();
      setJournalEntries(entries.filter((e: any) => !e.deleted_at));
    } catch (_) {}
  }, [journal]);

  const loadMood = useCallback(async () => {
    try {
      const logs = await mood.findAll();
      setMoodLogs(logs);
    } catch (_) {}
  }, [mood]);

  useEffect(() => {
    loadJournal();
    loadMood();
  }, [loadJournal, loadMood]);

  const handleSaveJournal = async () => {
    if (!journalText.trim()) return;
    await journal.create({
      title: journalTitle.trim() || null,
      entry_text: journalText.trim(),
    });
    setJournalText('');
    setJournalTitle('');
    loadJournal();
  };

  const handleVoiceDictation = async () => {
    if (isRecording) {
      setIsRecording(false);
      const text = await voiceService.stopListening();
      if (text) setJournalText((prev) => prev + (prev ? ' ' : '') + text);
    } else {
      setIsRecording(true);
      await voiceService.startListening();
    }
  };

  const handleSaveMood = async () => {
    await mood.create({
      mood_value: moodVal,
      energy_value: energyVal,
      stress_value: stressVal,
      note: moodNote.trim() || null,
    });
    setMoodNote('');
    loadMood();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'journal' && styles.tabActive]}
          onPress={() => setTab('journal')}
          accessibilityLabel="Journal tab"
        >
          <Text style={[styles.tabText, tab === 'journal' && styles.tabTextActive]}>Journal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'mood' && styles.tabActive]}
          onPress={() => setTab('mood')}
          accessibilityLabel="Mood tab"
        >
          <Text style={[styles.tabText, tab === 'mood' && styles.tabTextActive]}>Mood</Text>
        </TouchableOpacity>
      </View>

      {tab === 'journal' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TextInput
            style={styles.titleInput}
            value={journalTitle}
            onChangeText={setJournalTitle}
            placeholder="Title (optional)"
            accessibilityLabel="Journal title"
          />
          <TextInput
            style={styles.journalInput}
            value={journalText}
            onChangeText={setJournalText}
            placeholder="What's on your mind?"
            multiline
            textAlignVertical="top"
            accessibilityLabel="Journal entry"
          />
          <View style={styles.journalActions}>
            <TouchableOpacity
              style={[styles.voiceBtn, isRecording && styles.voiceBtnActive]}
              onPress={handleVoiceDictation}
              accessibilityLabel={isRecording ? 'Stop dictation' : 'Voice dictation'}
            >
              <Text style={styles.voiceBtnText}>{isRecording ? '⏹ Stop' : '🎙 Dictate'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !journalText.trim() && styles.saveBtnDisabled]}
              onPress={handleSaveJournal}
              disabled={!journalText.trim()}
              accessibilityLabel="Save journal entry"
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          {journalEntries.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Recent entries</Text>
              {journalEntries.slice(0, 10).map((entry) => (
                <View key={entry.id} style={styles.entryCard}>
                  {entry.title ? <Text style={styles.entryTitle}>{entry.title}</Text> : null}
                  <Text style={styles.entryText} numberOfLines={3}>{entry.entry_text}</Text>
                  <Text style={styles.entryDate}>{new Date(entry.created_at).toLocaleDateString()}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sliderLabel}>Mood <Text style={styles.sliderValue}>{moodVal}/5</Text></Text>
          <Slider minimumValue={1} maximumValue={5} step={1} value={moodVal} onValueChange={setMoodVal} minimumTrackTintColor="#5BA8C4" accessibilityLabel="Mood slider" />

          <Text style={styles.sliderLabel}>Energy <Text style={styles.sliderValue}>{energyVal}/5</Text></Text>
          <Slider minimumValue={1} maximumValue={5} step={1} value={energyVal} onValueChange={setEnergyVal} minimumTrackTintColor="#7ACC8A" accessibilityLabel="Energy slider" />

          <Text style={styles.sliderLabel}>Stress <Text style={styles.sliderValue}>{stressVal}/5</Text></Text>
          <Slider minimumValue={1} maximumValue={5} step={1} value={stressVal} onValueChange={setStressVal} minimumTrackTintColor="#E07070" accessibilityLabel="Stress slider" />

          <TextInput
            style={styles.moodNote}
            value={moodNote}
            onChangeText={setMoodNote}
            placeholder="Optional note"
            multiline
            accessibilityLabel="Mood note"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMood} accessibilityLabel="Log mood">
            <Text style={styles.saveBtnText}>Log mood</Text>
          </TouchableOpacity>

          {moodLogs.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Recent moods</Text>
              {moodLogs.slice(0, 7).map((log) => (
                <View key={log.id} style={styles.moodCard}>
                  <View style={styles.moodRow}>
                    <Text style={styles.moodChip}>😊 {log.mood_value}</Text>
                    <Text style={styles.moodChip}>⚡ {log.energy_value}</Text>
                    <Text style={styles.moodChip}>⚡ Stress {log.stress_value}</Text>
                  </View>
                  {log.note ? <Text style={styles.moodNote2}>{log.note}</Text> : null}
                  <Text style={styles.entryDate}>{new Date(log.created_at).toLocaleDateString()}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE', backgroundColor: '#fff' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#5BA8C4' },
  tabText: { fontSize: 15, color: '#888', fontWeight: '600' },
  tabTextActive: { color: '#5BA8C4' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  titleInput: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 10 },
  journalInput: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 15, minHeight: 160, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 12 },
  journalActions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  voiceBtn: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  voiceBtnActive: { backgroundColor: '#FFE5E5' },
  voiceBtnText: { fontSize: 14, fontWeight: '600', color: '#555' },
  saveBtn: { flex: 1, backgroundColor: '#5BA8C4', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#C5C5C5' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  historySection: { marginTop: 10 },
  historyTitle: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  entryCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  entryTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  entryText: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 6 },
  entryDate: { fontSize: 11, color: '#AAA' },
  sliderLabel: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 4 },
  sliderValue: { color: '#5BA8C4' },
  moodNote: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#E0E0E0', marginTop: 12, marginBottom: 16, minHeight: 60 },
  moodCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  moodRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  moodChip: { fontSize: 13, color: '#555', backgroundColor: '#F5F5F5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  moodNote2: { fontSize: 13, color: '#666', marginBottom: 4 },
});
