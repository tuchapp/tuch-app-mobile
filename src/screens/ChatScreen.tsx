/**
 * ChatScreen — AI Coach with SSE streaming
 *
 * Full chat experience ported from the web app:
 *  - Session management (list, create, switch)
 *  - Message display with FlatList
 *  - SSE streaming via POST /api/v1/chat/sessions/{id}/messages/stream
 *  - Follow-up suggestion chips
 *  - Tone picker (PATCH /api/v1/preferences/me)
 *  - Auto-scroll on new messages
 *  - 30s timeout indicator
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { supabase } from "../lib/supabase";
import { apiGet, apiPost, apiPatch } from "../lib/api";
import { COACHING_TONES, getTone, DEFAULT_COACHING_TONE } from "../utils/coaching-tones";
import type {
  ApiEnvelope,
  ChatMessage,
  ChatSession,
  UserPreferences,
} from "../types/api-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRAND = "#7e22ce";
const API_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  "";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChatStartResponse = ApiEnvelope<{
  conversation_id: string;
  status: string;
  started_at: string;
}>;

type ChatMessageResponse = ApiEnvelope<{
  conversation_id: string;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  memory_context_used: boolean;
  follow_up_suggestions: string[];
  goal_detected: boolean;
  goal_suggestion: Record<string, unknown> | null;
}>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeSession(session: ChatSession): ChatSession {
  return {
    ...session,
    conversation_id: session.conversation_id ?? session.id,
    messages: session.messages ?? [],
  };
}

/** Parse SSE text into discrete events. */
function parseSSEEvents(text: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = text.split("\n\n");
  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split("\n");
    let eventType = "message";
    let eventData = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        eventData = line.slice(6).trim();
      }
    }
    if (eventData) {
      events.push({ event: eventType, data: eventData });
    }
  }
  return events;
}

/** Simple inline markdown: **bold**, *italic*, line breaks. */
function formatContent(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) nodes.push(<Text key={`br-${i}`}>{"\n"}</Text>);
    const parts = lines[i].split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    for (let j = 0; j < parts.length; j++) {
      const part = parts[j];
      if (part.startsWith("**") && part.endsWith("**")) {
        nodes.push(
          <Text key={`${i}-${j}`} style={s.bold}>
            {part.slice(2, -2)}
          </Text>
        );
      } else if (part.startsWith("*") && part.endsWith("*")) {
        nodes.push(
          <Text key={`${i}-${j}`} style={s.italic}>
            {part.slice(1, -1)}
          </Text>
        );
      } else {
        nodes.push(part);
      }
    }
  }
  return nodes;
}

// ---------------------------------------------------------------------------
// Sub-components (inline)
// ---------------------------------------------------------------------------

/** A single chat bubble. */
const MessageBubble = React.memo(function MessageBubble({
  message,
  onChipPress,
}: {
  message: ChatMessage;
  onChipPress: (text: string) => void;
}) {
  const isUser = message.role === "user";
  const chips: string[] =
    (message.metadata?.follow_up_suggestions as string[] | undefined) ?? [];
  const formatted = useMemo(() => formatContent(message.content), [message.content]);

  return (
    <View style={[s.bubbleRow, isUser ? s.bubbleRowUser : s.bubbleRowAssistant]}>
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAssistant]}>
        <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>{formatted}</Text>
      </View>
      {!isUser && chips.length > 0 && (
        <View style={s.chipsRow}>
          <Text style={s.chipsLabel}>You could say:</Text>
          {chips.map((chip) => (
            <Pressable key={chip} style={s.chip} onPress={() => onChipPress(chip)}>
              <Text style={s.chipText}>{chip}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
});

/** Inline tone picker. */
function TonePicker({
  tone,
  onToneChange,
}: {
  tone: string;
  onToneChange: (next: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeTone = getTone(tone);

  async function handleSelect(next: string) {
    if (next === tone || saving) return;
    const previous = tone;
    onToneChange(next);
    setError(null);
    setSaving(true);
    try {
      await apiPatch<ApiEnvelope<UserPreferences>>("/api/v1/preferences/me", {
        coaching_tone: next,
      });
    } catch (err) {
      onToneChange(previous);
      setError(err instanceof Error ? err.message : "Could not save tone.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={s.toneSection}>
      <Text style={s.toneSectionLabel}>Coaching tone</Text>
      <View style={s.tonePills}>
        {COACHING_TONES.map((t) => {
          const active = t.value === tone;
          return (
            <Pressable
              key={t.value}
              style={[s.tonePill, active && s.tonePillActive]}
              disabled={saving}
              onPress={() => void handleSelect(t.value)}
            >
              <Text style={[s.tonePillText, active && s.tonePillTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.toneDescription}>{activeTone.description}</Text>
      {error && <Text style={s.toneError}>{error}</Text>}
    </View>
  );
}

/** Session list item. */
function SessionCard({
  session,
  isSelected,
  onPress,
}: {
  session: ChatSession;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[s.sessionCard, isSelected && s.sessionCardActive]}
      onPress={onPress}
    >
      <View style={s.sessionCardRow}>
        <Text style={s.sessionCardTitle}>
          {session.status === "active" ? "Active session" : "Completed session"}
        </Text>
        <View style={[s.statusPill, session.status === "active" && s.statusPillActive]}>
          <Text
            style={[
              s.statusPillText,
              session.status === "active" && s.statusPillTextActive,
            ]}
          >
            {session.status}
          </Text>
        </View>
      </View>
      <Text style={s.sessionCardDate}>
        {new Date(session.updated_at || session.started_at).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </Pressable>
  );
}

/** Typing indicator dots. */
function TypingDots({ timedOut }: { timedOut: boolean }) {
  if (timedOut) {
    return (
      <View style={s.typingBubble}>
        <Text style={s.typingTimeout}>
          Still thinking... this is taking longer than usual.
        </Text>
      </View>
    );
  }
  return (
    <View style={s.typingBubble}>
      <Text style={s.typingDots}>...</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChatScreen() {
  // ── State ──
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sendingTimedOut, setSendingTimedOut] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [tone, setTone] = useState<string>(DEFAULT_COACHING_TONE);

  const flatListRef = useRef<FlatList>(null);
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionCacheRef = useRef<Record<string, ChatSession>>({});
  const autoStartedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const messages = useMemo(
    () => selectedSession?.messages ?? [],
    [selectedSession]
  );

  const isBusy = isSending || isStreaming;

  // ── Cleanup timeout on unmount ──
  useEffect(() => {
    return () => {
      if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // ── Initial load ──
  useEffect(() => {
    void loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadInitialData() {
    try {
      const [sessionsEnvelope, prefsEnvelope] = await Promise.all([
        apiGet<ApiEnvelope<ChatSession[]>>("/api/v1/chat/sessions"),
        apiGet<ApiEnvelope<UserPreferences>>("/api/v1/preferences/me").catch(
          () => null
        ),
      ]);
      const loadedSessions = (sessionsEnvelope.data ?? []).map(normalizeSession);
      setSessions(loadedSessions);

      if (prefsEnvelope?.data?.coaching_tone) {
        setTone(prefsEnvelope.data.coaching_tone);
      }

      // Auto-select or auto-start
      const active = loadedSessions.find((s) => s.status === "active");
      if (active) {
        void handleSelectSession(active.id, loadedSessions);
      } else if (!autoStartedRef.current) {
        autoStartedRef.current = true;
        void handleStartSession();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sessions.");
    } finally {
      setLoadingSessions(false);
    }
  }

  // ── Auto-scroll on new messages ──
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to let FlatList render
      const id = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(id);
    }
  }, [messages.length]);

  // ── Session management ──

  function upsertSession(nextSession: ChatSession) {
    const normalized = normalizeSession(nextSession);
    sessionCacheRef.current[normalized.id] = normalized;
    setSessions((current) => {
      const remaining = current.filter((s) => s.id !== normalized.id);
      return [normalized, ...remaining];
    });
  }

  async function handleSelectSession(
    sessionId: string,
    sessionList?: ChatSession[]
  ) {
    if (isBusy) return;
    setError(null);
    setSelectedId(sessionId);

    const cached = sessionCacheRef.current[sessionId];
    if (cached) {
      setSelectedSession(cached);
      return;
    }

    try {
      const payload = await apiGet<ApiEnvelope<ChatSession>>(
        `/api/v1/chat/sessions/${sessionId}`
      );
      const nextSession = normalizeSession(payload.data);
      sessionCacheRef.current[sessionId] = nextSession;
      setSelectedSession(nextSession);
      upsertSession(nextSession);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Conversation could not be loaded."
      );
    }
  }

  async function handleStartSession() {
    setError(null);
    setIsStarting(true);
    try {
      const payload = await apiPost<ChatStartResponse>(
        "/api/v1/chat/sessions"
      );
      const sessionId = payload.data.conversation_id;
      const nextSession = normalizeSession({
        id: sessionId,
        conversation_id: sessionId,
        status: payload.data.status,
        started_at: payload.data.started_at,
        updated_at: payload.data.started_at,
        messages: [],
      });
      setSelectedId(sessionId);
      setSelectedSession(nextSession);
      setDraft("");
      upsertSession(nextSession);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "A new session could not be started."
      );
    } finally {
      setIsStarting(false);
    }
  }

  async function handleEndSession() {
    if (!selectedSession) return;
    try {
      await apiPost(`/api/v1/chat/sessions/${selectedSession.id}/end`);
      const nextSession = normalizeSession({
        ...selectedSession,
        status: "ended",
        ended_at: new Date().toISOString(),
      });
      setSelectedSession(nextSession);
      upsertSession(nextSession);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "This session could not be ended."
      );
    }
  }

  // ── SSE streaming ──

  async function streamToAssistant(
    sessionId: string,
    content: string,
    optimisticSession: ChatSession,
    previousSession: ChatSession,
    optimisticId: string
  ) {
    setIsStreaming(true);

    // Add streaming placeholder
    const streamingPlaceholder: ChatMessage = {
      id: "streaming",
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      metadata: null,
    };

    setSelectedSession((prev) => {
      if (!prev) return prev;
      return normalizeSession({
        ...prev,
        messages: [...(prev.messages ?? []), streamingPlaceholder],
      });
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `${API_URL}/api/v1/chat/sessions/${sessionId}/messages/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authSession?.access_token}`,
          },
          body: JSON.stringify({ content }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let fullText = "";

      // Try ReadableStream first (works in newer React Native / Hermes)
      try {
        if (!response.body) throw new Error("No body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const eventBlock of events) {
            if (!eventBlock.trim()) continue;
            const lines = eventBlock.split("\n");
            let eventType = "message";
            let eventData = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith("data: ")) {
                eventData = line.slice(6).trim();
              }
            }

            if (!eventData) continue;

            try {
              const parsed = JSON.parse(eventData);
              switch (eventType) {
                case "token":
                  accumulated += parsed.token;
                  setSelectedSession((prev) => {
                    if (!prev) return prev;
                    const msgs = (prev.messages ?? []).map((m) =>
                      m.id === "streaming"
                        ? { ...m, content: accumulated }
                        : m
                    );
                    return { ...prev, messages: msgs };
                  });
                  break;
                case "done":
                  finalizeStream(parsed.messageId, parsed.follow_up_suggestions);
                  break;
                case "error":
                  throw new Error(parsed.error || "Stream error");
              }
            } catch (parseErr) {
              // If it's a rethrown error, propagate
              if (parseErr instanceof Error && parseErr.message !== "Stream error") {
                // Ignore malformed JSON events only
                if (eventData.startsWith("{")) continue;
              }
              throw parseErr;
            }
          }
        }

        // If we got here without a done event, check buffer for remaining
        if (buffer.trim()) {
          const remaining = parseSSEEvents(buffer);
          for (const evt of remaining) {
            try {
              const parsed = JSON.parse(evt.data);
              if (evt.event === "token") {
                accumulated += parsed.token;
              } else if (evt.event === "done") {
                finalizeStream(parsed.messageId, parsed.follow_up_suggestions);
              }
            } catch {
              // ignore
            }
          }
          // Update with final accumulated text
          if (accumulated) {
            setSelectedSession((prev) => {
              if (!prev) return prev;
              const msgs = (prev.messages ?? []).map((m) =>
                m.id === "streaming" ? { ...m, content: accumulated } : m
              );
              return { ...prev, messages: msgs };
            });
          }
        }
      } catch {
        // ReadableStream not supported — fall back to reading entire response as text
        fullText = await response.text();

        const events = parseSSEEvents(fullText);
        let accumulated = "";

        for (const evt of events) {
          try {
            const parsed = JSON.parse(evt.data);
            switch (evt.event) {
              case "token":
                accumulated += parsed.token;
                break;
              case "done":
                // Update with full accumulated text then finalize
                setSelectedSession((prev) => {
                  if (!prev) return prev;
                  const msgs = (prev.messages ?? []).map((m) =>
                    m.id === "streaming" ? { ...m, content: accumulated } : m
                  );
                  return { ...prev, messages: msgs };
                });
                finalizeStream(parsed.messageId, parsed.follow_up_suggestions);
                break;
              case "error":
                throw new Error(parsed.error || "Stream error");
            }
          } catch (e) {
            if (e instanceof Error && e.message === "Stream error") throw e;
            // Ignore malformed events
          }
        }

        // If no done event was received, still show whatever we accumulated
        if (accumulated) {
          setSelectedSession((prev) => {
            if (!prev) return prev;
            const msgs = (prev.messages ?? []).map((m) =>
              m.id === "streaming" ? { ...m, content: accumulated } : m
            );
            return { ...prev, messages: msgs };
          });
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;

      // Remove streaming placeholder and fall back to non-streaming
      setSelectedSession((prev) => {
        if (!prev) return prev;
        const msgs = (prev.messages ?? []).filter((m) => m.id !== "streaming");
        return { ...prev, messages: msgs };
      });

      void sendNonStreaming(
        sessionId,
        content,
        optimisticId,
        optimisticSession,
        previousSession
      );
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function finalizeStream(messageId?: string, followUpSuggestions?: string[]) {
    setSelectedSession((prev) => {
      if (!prev) return prev;
      const msgs = (prev.messages ?? []).map((m) => {
        if (m.id === "streaming") {
          return {
            ...m,
            id: messageId || `msg-${Date.now()}`,
            metadata: followUpSuggestions?.length
              ? { follow_up_suggestions: followUpSuggestions }
              : m.metadata,
          };
        }
        return m;
      });
      const updated = normalizeSession({
        ...prev,
        messages: msgs,
        updated_at: new Date().toISOString(),
      });
      upsertSession(updated);
      return updated;
    });

    setIsSending(false);
    setSendingTimedOut(false);
    if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
  }

  /** Non-streaming fallback. */
  async function sendNonStreaming(
    sessionId: string,
    content: string,
    optimisticId: string,
    optimisticSession: ChatSession,
    previousSession: ChatSession
  ) {
    try {
      const payload = await apiPost<ChatMessageResponse>(
        `/api/v1/chat/sessions/${sessionId}/messages`,
        { content }
      );

      const nextMessages = (optimisticSession.messages ?? [])
        .filter((m) => m.id !== optimisticId)
        .concat([payload.data.user_message, payload.data.assistant_message]);

      const nextSession = normalizeSession({
        ...optimisticSession,
        messages: nextMessages,
        updated_at: payload.data.assistant_message.created_at,
      });

      setSelectedSession(nextSession);
      upsertSession(nextSession);
    } catch (err) {
      setDraft(content);
      setSelectedSession(previousSession);
      upsertSession(previousSession);
      setError(
        err instanceof Error ? err.message : "Your message could not be sent."
      );
    } finally {
      setIsSending(false);
      setSendingTimedOut(false);
      if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
    }
  }

  // ── Send message ──

  async function handleSendMessage() {
    const content = draft.trim();
    if (!selectedSession || !content || isBusy) return;

    setError(null);
    setDraft("");
    setIsSending(true);
    setSendingTimedOut(false);
    if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
    sendTimeoutRef.current = setTimeout(() => setSendingTimedOut(true), 30_000);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
      metadata: null,
    };

    const previousSession = selectedSession;
    const optimisticSession = normalizeSession({
      ...selectedSession,
      messages: [...(selectedSession.messages ?? []), optimisticMessage],
      updated_at: new Date().toISOString(),
    });

    setSelectedSession(optimisticSession);
    upsertSession(optimisticSession);

    // Attempt streaming, with non-streaming fallback inside
    void streamToAssistant(
      selectedSession.id,
      content,
      optimisticSession,
      previousSession,
      optimisticId
    );
  }

  // ── Follow-up chip press ──
  const handleChipPress = useCallback((text: string) => {
    setDraft(text);
  }, []);

  // ── Render helpers ──

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble message={item} onChipPress={handleChipPress} />
    ),
    [handleChipPress]
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // ── Loading state ──
  if (loadingSessions) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={s.loadingText}>Connecting to your coach...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ──
  return (
    <SafeAreaView style={s.safeArea} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Pressable style={s.headerBtn} onPress={() => setShowSidebar(true)}>
            <Text style={s.headerBtnText}>Sessions</Text>
          </Pressable>
          <Text style={s.headerTitle}>Coach</Text>
          {selectedSession?.status === "active" ? (
            <Pressable style={s.headerBtn} onPress={() => void handleEndSession()}>
              <Text style={s.headerBtnText}>End</Text>
            </Pressable>
          ) : (
            <View style={s.headerBtnPlaceholder} />
          )}
        </View>

        {/* ── Status pill ── */}
        {selectedSession && (
          <View style={s.statusBar}>
            <View
              style={[
                s.statusPill,
                selectedSession.status === "active" && s.statusPillActive,
              ]}
            >
              <Text
                style={[
                  s.statusPillText,
                  selectedSession.status === "active" && s.statusPillTextActive,
                ]}
              >
                {selectedSession.status}
              </Text>
            </View>
          </View>
        )}

        {/* ── Message list or empty state ── */}
        {selectedSession ? (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={keyExtractor}
              contentContainerStyle={s.messageList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
              ListEmptyComponent={
                <View style={s.emptyMessages}>
                  <Text style={s.emptyMessagesText}>
                    Start a conversation with your coach.
                  </Text>
                </View>
              }
              ListFooterComponent={
                <>
                  {isBusy && !isStreaming && (
                    <TypingDots timedOut={sendingTimedOut} />
                  )}
                  {selectedSession.summary && (
                    <View style={s.summaryCard}>
                      <Text style={s.summaryLabel}>Session summary</Text>
                      <Text style={s.summaryText}>
                        {selectedSession.summary.summary_text}
                      </Text>
                      {(selectedSession.summary.extracted_themes ?? []).length >
                        0 && (
                        <View style={s.themesRow}>
                          {selectedSession.summary.extracted_themes!.map(
                            (theme) => (
                              <View key={theme} style={s.themePill}>
                                <Text style={s.themePillText}>{theme}</Text>
                              </View>
                            )
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </>
              }
            />

            {/* Error */}
            {error && (
              <View style={s.errorBar}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* ── Input bar or ended notice ── */}
            {selectedSession.status === "active" ? (
              <View style={s.inputBar}>
                <View style={s.inputSurface}>
                  <TextInput
                    style={s.inputField}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="What's most true right now?"
                    placeholderTextColor="#999"
                    multiline
                    editable={!isBusy}
                    onSubmitEditing={handleSendMessage}
                    blurOnSubmit={false}
                    returnKeyType="send"
                  />
                  <Pressable
                    style={[s.sendBtn, (!draft.trim() || isBusy) && s.sendBtnDisabled]}
                    onPress={handleSendMessage}
                    disabled={!draft.trim() || isBusy}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={s.sendBtnText}>Send</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={s.endedBar}>
                <Text style={s.endedText}>Session complete.</Text>
                <Pressable
                  style={s.newSessionBtn}
                  disabled={isStarting}
                  onPress={() => void handleStartSession()}
                >
                  <Text style={s.newSessionBtnText}>
                    {isStarting ? "Starting..." : "New session"}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <View style={s.center}>
            {isStarting ? (
              <>
                <ActivityIndicator size="large" color={BRAND} />
                <Text style={s.loadingText}>Starting your session...</Text>
              </>
            ) : error ? (
              <>
                <Text style={s.errorText}>{error}</Text>
                <Pressable
                  style={s.newSessionBtn}
                  onPress={() => {
                    autoStartedRef.current = false;
                    setError(null);
                    void handleStartSession();
                  }}
                >
                  <Text style={s.newSessionBtnText}>Try again</Text>
                </Pressable>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color={BRAND} />
                <Text style={s.loadingText}>Connecting to your coach...</Text>
              </>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── Sessions sidebar (modal) ── */}
      <Modal
        visible={showSidebar}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSidebar(false)}
      >
        <SafeAreaView style={s.sidebarSafeArea}>
          <View style={s.sidebarHeader}>
            <Text style={s.sidebarTitle}>Sessions</Text>
            <Pressable onPress={() => setShowSidebar(false)}>
              <Text style={s.sidebarClose}>Close</Text>
            </Pressable>
          </View>

          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.sidebarList}
            renderItem={({ item }) => (
              <SessionCard
                session={item}
                isSelected={item.id === selectedId}
                onPress={() => {
                  void handleSelectSession(item.id);
                  setShowSidebar(false);
                }}
              />
            )}
            ListEmptyComponent={
              <Text style={s.sidebarEmpty}>No sessions yet.</Text>
            }
          />

          <TonePicker tone={tone} onToneChange={setTone} />

          <View style={s.sidebarActions}>
            <Pressable
              style={[s.button, isStarting && s.buttonDisabled]}
              disabled={isStarting}
              onPress={() => {
                void handleStartSession();
                setShowSidebar(false);
              }}
            >
              <Text style={s.buttonText}>
                {isStarting ? "Starting..." : "New session"}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  sidebarSafeArea: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loadingText: { marginTop: 12, fontSize: 15, color: "#888" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  headerBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  headerBtnText: { fontSize: 15, color: BRAND, fontWeight: "600" },
  headerBtnPlaceholder: { width: 60 },

  // Status bar
  statusBar: { alignItems: "center", paddingVertical: 6 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  statusPillActive: { backgroundColor: "#f0e6ff" },
  statusPillText: { fontSize: 12, color: "#666", fontWeight: "500" },
  statusPillTextActive: { color: BRAND },

  // Message list
  messageList: { paddingHorizontal: 16, paddingVertical: 12 },
  emptyMessages: { alignItems: "center", paddingVertical: 48 },
  emptyMessagesText: { fontSize: 15, color: "#999" },

  // Bubbles
  bubbleRow: { marginBottom: 12 },
  bubbleRowUser: { alignItems: "flex-end" },
  bubbleRowAssistant: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: { backgroundColor: BRAND, borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: "#f3f4f6", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22, color: "#111" },
  bubbleTextUser: { color: "#fff" },
  bold: { fontWeight: "700" },
  italic: { fontStyle: "italic" },

  // Follow-up chips
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    maxWidth: "80%",
  },
  chipsLabel: { fontSize: 12, color: "#888", width: "100%", marginBottom: 2 },
  chip: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  chipText: { fontSize: 13, color: "#333" },

  // Typing dots
  typingBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  typingDots: { fontSize: 20, color: "#999", letterSpacing: 4 },
  typingTimeout: { fontSize: 13, color: "#999", fontStyle: "italic" },

  // Summary card
  summaryCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryLabel: { fontSize: 13, fontWeight: "600", color: "#888", marginBottom: 6 },
  summaryText: { fontSize: 14, lineHeight: 20, color: "#333" },
  themesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  themePill: {
    backgroundColor: "#f0e6ff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  themePillText: { fontSize: 12, color: BRAND, fontWeight: "500" },

  // Error bar
  errorBar: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: { fontSize: 14, color: "#dc2626" },

  // Input bar
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  inputSurface: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f9fafb",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    maxHeight: 120,
    paddingVertical: Platform.OS === "ios" ? 8 : 6,
  },
  sendBtn: {
    backgroundColor: BRAND,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Ended bar
  endedBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  endedText: { fontSize: 15, color: "#888" },

  // Buttons
  button: {
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  newSessionBtn: {
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  newSessionBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  // ── Sidebar (modal) ──
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sidebarTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  sidebarClose: { fontSize: 15, color: BRAND, fontWeight: "600" },
  sidebarList: { padding: 16, gap: 8 },
  sidebarEmpty: {
    fontSize: 15,
    color: "#999",
    textAlign: "center",
    paddingVertical: 24,
  },
  sidebarActions: { padding: 16 },

  // Session cards
  sessionCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
  },
  sessionCardActive: { borderColor: BRAND, backgroundColor: "#faf5ff" },
  sessionCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sessionCardTitle: { fontSize: 14, fontWeight: "600", color: "#333" },
  sessionCardDate: { fontSize: 12, color: "#999" },

  // Tone picker
  toneSection: { padding: 16, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  toneSectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  tonePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  tonePill: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  tonePillActive: {
    borderColor: BRAND,
    backgroundColor: "#faf5ff",
  },
  tonePillText: { fontSize: 13, color: "#555" },
  tonePillTextActive: { color: BRAND, fontWeight: "600" },
  toneDescription: { fontSize: 13, color: "#888" },
  toneError: { fontSize: 13, color: "#dc2626", marginTop: 4 },
});
