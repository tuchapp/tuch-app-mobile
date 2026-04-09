/**
 * V2 CoachScreen — Chat with voice mode.
 * Sends ONLY sanitized context to /api/v2/agent/query. Never forwards PII.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, Animated, ActivityIndicator,
} from 'react-native';
import { useDatabase } from '../context/DatabaseContext';
import { useAgent } from '../context/AgentContext';
import { apiClient } from '../api/client';
import { buildSanitizedContext } from '../voice/sanitized_context_builder';
import { voiceService } from '../voice/voice_service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export default function CoachScreen() {
  const { conversation: convRepo, events } = useDatabase();
  const { profile } = useAgent();
  const dbContext = useDatabase();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionTurn, setSessionTurn] = useState(1);
  const listRef = useRef<FlatList>(null);
  const waveAnim = useRef(new Animated.Value(1)).current;

  // Animated waveform
  useEffect(() => {
    if (isVoiceMode || isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
          Animated.timing(waveAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      waveAnim.stopAnimation();
      waveAnim.setValue(1);
    }
  }, [isVoiceMode, isRecording, waveAnim]);

  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId;
    const conv = await convRepo.create();
    setConversationId(conv.id);
    return conv.id;
  }, [conversationId, convRepo]);

  const send = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsLoading(true);
    const convId = await ensureConversation();

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setSessionTurn((t) => t + 1);

    // Save locally
    await convRepo.addMessage(convId, 'user', text);
    await events.create({ event_name: 'chat_message_sent', domain: 'coach', entity_type: 'conversation', entity_id: convId });

    // Build sanitized context (no PII)
    // NOTE: user message text is passed as-is; the backend will not receive goal titles,
    // journal text, or names — those never appear in this chat context.
    let db: any;
    try {
      // Access the raw db via a DB repository hack
      db = (dbContext.goals as any).db;
    } catch (_) {}

    const sanitizedCtx = db
      ? await buildSanitizedContext(db, text, sessionTurn)
      : { dominant_state: null, active_patterns: [], signal_snapshot: {}, user_message: text, session_turn: sessionTurn };

    try {
      const res = await apiClient.post('/agent/query', {
        query_type: 'coaching_response',
        sanitized_context: sanitizedCtx,
      });
      const responseText: string = res?.data?.response_text ?? "I'm here. What's on your mind?";
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      await convRepo.addMessage(convId, 'assistant', responseText);

      // Speak in voice mode
      if (isVoiceMode) {
        await voiceService.speak(responseText, { tone: profile?.coaching_tone });
      }
    } catch (e: any) {
      const fallback = "I couldn't reach the brain right now. Try again in a moment.";
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: fallback, created_at: new Date().toISOString() }]);
    }
    setIsLoading(false);
  }, [convRepo, events, ensureConversation, sessionTurn, isVoiceMode, profile, dbContext]);

  const handleMicPress = async () => {
    if (isRecording) {
      setIsRecording(false);
      const text = await voiceService.stopListening();
      if (text) await send(text);
    } else {
      setIsRecording(true);
      await voiceService.startListening();
    }
  };

  const handleMicLongPress = () => {
    setIsVoiceMode(true);
    handleMicPress();
  };

  const exitVoiceMode = () => {
    setIsVoiceMode(false);
    voiceService.stopSpeaking();
  };

  // Voice mode full-screen
  if (isVoiceMode) {
    return (
      <SafeAreaView style={styles.voiceContainer}>
        <TouchableOpacity style={styles.voiceArea} onPress={exitVoiceMode} accessibilityLabel="Exit voice mode, tap anywhere">
          <Animated.View style={[styles.waveCircle, { transform: [{ scale: waveAnim }] }]} />
          <Text style={styles.voiceHint}>Tap anywhere to exit voice mode</Text>
          {isRecording && <Text style={styles.listeningLabel}>Listening…</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.micBtn, isRecording && styles.micBtnActive]}
          onPress={handleMicPress}
          accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <Text style={styles.micBtnText}>{isRecording ? '⏹' : '🎙'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>Say hello to start a conversation.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.agentBubble]}>
              <Text style={[styles.bubbleText, item.role === 'user' ? styles.userText : styles.agentText]}>
                {item.content}
              </Text>
            </View>
          )}
        />
        {isLoading && (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color="#5BA8C4" />
            <Text style={styles.typingText}>Thinking…</Text>
          </View>
        )}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message…"
            multiline
            maxLength={1000}
            accessibilityLabel="Message input"
          />
          <TouchableOpacity
            style={[styles.micBtn, isRecording && styles.micBtnActive]}
            onPress={handleMicPress}
            onLongPress={handleMicLongPress}
            accessibilityLabel={isRecording ? 'Stop recording' : 'Hold for voice mode, tap to record'}
          >
            <Text style={styles.micBtnText}>{isRecording ? '⏹' : '🎙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={() => send(inputText)}
            disabled={!inputText.trim() || isLoading}
            accessibilityLabel="Send message"
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  messageList: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#5BA8C4' },
  agentBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  agentText: { color: '#1A1A1A' },
  emptyChat: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyChatText: { color: '#AAA', fontSize: 15 },
  typingRow: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingLeft: 20, gap: 8 },
  typingText: { color: '#888', fontSize: 13 },
  inputBar: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  micBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  micBtnActive: { backgroundColor: '#FFE5E5' },
  micBtnText: { fontSize: 20 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#5BA8C4', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#C5C5C5' },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  // Voice mode
  voiceContainer: { flex: 1, backgroundColor: '#1A2E3A', justifyContent: 'center', alignItems: 'center' },
  voiceArea: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  waveCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(91, 168, 196, 0.35)', marginBottom: 24 },
  voiceHint: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 8 },
  listeningLabel: { color: '#5BA8C4', fontSize: 16, fontWeight: '600' },
});
