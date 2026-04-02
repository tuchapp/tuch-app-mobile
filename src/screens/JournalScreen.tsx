/**
 * JournalScreen -- View and create journal entries.
 *
 * API endpoints:
 *  - GET  /api/v1/journals
 *  - POST /api/v1/journals
 */
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiGet, apiPost } from "../lib/api";
import { formatDate } from "../utils/format-date";
import type { JournalEntry, PaginatedResponse } from "../types/api-types";

export function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [entryText, setEntryText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      setError(null);
      const res = await apiGet<PaginatedResponse<JournalEntry>>("/api/v1/journals");
      setEntries(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load journals.");
    }
  }, []);

  useEffect(() => {
    fetchEntries().finally(() => setLoading(false));
  }, [fetchEntries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  }, [fetchEntries]);

  async function handleSubmit() {
    const trimmedText = entryText.trim();
    if (!trimmedText) return;

    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      await apiPost("/api/v1/journals", {
        title: title.trim() || null,
        entry_text: trimmedText,
        tags: parsedTags,
      });
      setTitle("");
      setTags("");
      setEntryText("");
      setShowForm(false);
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry.");
    } finally {
      setSubmitting(false);
    }
  }

  const latestEntry = entries[0] ?? null;
  const olderEntries = entries.slice(1);

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <ActivityIndicator color="#7e22ce" size="large" style={s.centered} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.flex}
      >
        <FlatList
          data={olderEntries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7e22ce" />
          }
          ListHeaderComponent={
            <>
              <Text style={s.screenTitle}>Journal</Text>

              {error && <Text style={s.error}>{error}</Text>}

              {/* New entry button / form */}
              {showForm ? (
                <View style={s.card}>
                  <Text style={s.cardTitle}>New Entry</Text>

                  <Text style={s.label}>Title</Text>
                  <TextInput
                    style={s.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="What stayed with me"
                    placeholderTextColor="#999"
                  />

                  <Text style={s.label}>Tags</Text>
                  <TextInput
                    style={s.input}
                    value={tags}
                    onChangeText={setTags}
                    placeholder="focus, energy"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                  />

                  <Text style={s.label}>Entry</Text>
                  <TextInput
                    style={[s.input, s.textArea]}
                    value={entryText}
                    onChangeText={setEntryText}
                    placeholder="What happened today, and what does it mean?"
                    placeholderTextColor="#999"
                    multiline
                    textAlignVertical="top"
                  />

                  <View style={s.formActions}>
                    <Pressable
                      style={s.secondaryButton}
                      onPress={() => setShowForm(false)}
                    >
                      <Text style={s.secondaryButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[s.button, submitting && s.buttonDisabled]}
                      onPress={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={s.buttonText}>Save entry</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable style={s.addButton} onPress={() => setShowForm(true)}>
                  <Text style={s.addButtonText}>+ New Journal Entry</Text>
                </Pressable>
              )}

              {/* Latest entry highlighted */}
              {latestEntry && (
                <View style={s.latestCard}>
                  <Text style={s.sectionLabel}>Latest</Text>
                  <View style={s.cardHeader}>
                    <Text style={s.cardTitleText} numberOfLines={1}>
                      {latestEntry.title || "Untitled reflection"}
                    </Text>
                    <View style={s.pill}>
                      <Text style={s.pillText}>{formatDate(latestEntry.created_at)}</Text>
                    </View>
                  </View>
                  <Text style={s.bodyText} numberOfLines={4}>
                    {latestEntry.entry_text}
                  </Text>
                  {latestEntry.tags && latestEntry.tags.length > 0 && (
                    <View style={s.tagsRow}>
                      {latestEntry.tags.map((tag) => (
                        <View key={tag} style={s.tagChip}>
                          <Text style={s.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {olderEntries.length > 0 && (
                <Text style={s.sectionLabel}>History</Text>
              )}
            </>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitleText} numberOfLines={1}>
                  {item.title || "Untitled reflection"}
                </Text>
                <View style={s.pill}>
                  <Text style={s.pillText}>{formatDate(item.created_at)}</Text>
                </View>
              </View>
              <Text style={s.bodyText} numberOfLines={3}>
                {item.entry_text}
              </Text>
              {item.tags && item.tags.length > 0 && (
                <View style={s.tagsRow}>
                  {item.tags.map((tag) => (
                    <View key={tag} style={s.tagChip}>
                      <Text style={s.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            !latestEntry ? (
              <View style={s.emptyState}>
                <Text style={s.emptyText}>Your journal entries will appear here.</Text>
              </View>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 20, paddingBottom: 40 },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    marginBottom: 20,
  },
  error: {
    fontSize: 14,
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  // Form
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#fff",
  },
  textArea: { minHeight: 120, textAlignVertical: "top" },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  button: {
    backgroundColor: "#7e22ce",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  secondaryButtonText: { fontSize: 15, color: "#333", fontWeight: "500" },
  addButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  addButtonText: { fontSize: 15, color: "#7e22ce", fontWeight: "600" },
  // Latest card
  latestCard: {
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#7e22ce",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7e22ce",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitleText: { fontSize: 16, fontWeight: "600", color: "#111", flex: 1, marginRight: 8 },
  pill: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontSize: 12, color: "#666" },
  bodyText: { fontSize: 14, color: "#555", lineHeight: 20 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tagChip: {
    backgroundColor: "#f3e8ff",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: 12, color: "#7e22ce" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 15, color: "#999" },
});
