/**
 * V2 GoalsScreen — Goals list with drift warnings, milestone detail, and create flow.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, StyleSheet, SafeAreaView,
  FlatList, ActivityIndicator,
} from 'react-native';
import { useDatabase } from '../context/DatabaseContext';

const STATUS_COLORS: Record<string, string> = {
  not_started: '#AAA',
  active: '#5BA8C4',
  in_progress: '#5BA8C4',
  completed: '#7ACC8A',
  paused: '#D0A060',
  archived: '#CCC',
};

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  active: 'Active',
  in_progress: 'In progress',
  completed: 'Done',
  paused: 'Paused',
  archived: 'Archived',
};

export default function GoalsScreen() {
  const { goals } = useDatabase();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const all = await goals.findAll();
      const active = all.filter((g: any) => g.archived_at == null);
      setItems(active);
    } catch (_) {}
    setLoading(false);
  }, [goals]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await goals.create({
      title: newTitle.trim(),
      category: newCategory.trim() || 'general',
      target_date: newTargetDate || null,
      status: 'not_started',
      priority: 'medium',
    });
    setNewTitle(''); setNewCategory(''); setNewTargetDate('');
    setCreateVisible(false);
    load();
  };

  const isDrifting = (goal: any) => {
    if (!goal.updated_at) return false;
    const daysSince = (Date.now() - new Date(goal.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= 5 && goal.status !== 'completed';
  };

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color="#5BA8C4" /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Detail modal */}
      <Modal visible={!!selectedGoal} animationType="slide" onRequestClose={() => setSelectedGoal(null)}>
        <SafeAreaView style={styles.container}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedGoal?.title}</Text>
            <TouchableOpacity onPress={() => setSelectedGoal(null)} accessibilityLabel="Close">
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedGoal?.status] ?? '#AAA' }]}>
              <Text style={styles.statusText}>{STATUS_LABELS[selectedGoal?.status] ?? selectedGoal?.status}</Text>
            </View>
            {selectedGoal?.description ? <Text style={styles.goalDesc}>{selectedGoal.description}</Text> : null}
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${selectedGoal?.progress_percent ?? 0}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{Math.round(selectedGoal?.progress_percent ?? 0)}% complete</Text>
            {selectedGoal?.target_date && (
              <Text style={styles.targetDate}>Target: {selectedGoal.target_date}</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Create modal */}
      <Modal visible={createVisible} animationType="slide" onRequestClose={() => setCreateVisible(false)}>
        <SafeAreaView style={styles.container}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New goal</Text>
            <TouchableOpacity onPress={() => setCreateVisible(false)} accessibilityLabel="Close">
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder="What do you want to achieve?" accessibilityLabel="Goal title" />
            <Text style={styles.fieldLabel}>Category</Text>
            <TextInput style={styles.input} value={newCategory} onChangeText={setNewCategory} placeholder="e.g. health, career, habits" accessibilityLabel="Goal category" />
            <Text style={styles.fieldLabel}>Target date (optional)</Text>
            <TextInput style={styles.input} value={newTargetDate} onChangeText={setNewTargetDate} placeholder="YYYY-MM-DD" accessibilityLabel="Target date" />
            <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} accessibilityLabel="Save goal">
              <Text style={styles.saveBtnText}>Save goal</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.pageTitle}>Goals</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateVisible(true)} accessibilityLabel="Add goal">
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No goals yet. Add one to get started.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.goalCard}
              onPress={() => setSelectedGoal(item)}
              accessibilityLabel={`Goal: ${item.title}`}
            >
              <View style={styles.goalRow}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] ?? '#AAA' }]} />
                <Text style={styles.goalTitle} numberOfLines={1}>{item.title}</Text>
                {isDrifting(item) && <Text style={styles.driftBadge}>⚠ Drifting</Text>}
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${item.progress_percent ?? 0}%` }]} />
              </View>
              <Text style={styles.progressLabel}>{Math.round(item.progress_percent ?? 0)}%</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  addBtn: { backgroundColor: '#5BA8C4', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  goalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  goalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  goalTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  driftBadge: { fontSize: 11, color: '#D0A060', fontWeight: '600' },
  progressBar: { height: 4, backgroundColor: '#E8E8E8', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: '#5BA8C4', borderRadius: 2 },
  progressLabel: { fontSize: 11, color: '#888' },
  emptyText: { fontSize: 15, color: '#888', textAlign: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  closeBtn: { fontSize: 18, color: '#888', padding: 4 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  goalDesc: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 12 },
  targetDate: { fontSize: 13, color: '#888', marginTop: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0' },
  saveBtn: { backgroundColor: '#5BA8C4', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
