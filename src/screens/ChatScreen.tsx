/**
 * ChatScreen
 *
 * API endpoints:
 *  - GET  /api/v1/chat/sessions
 *  - POST /api/v1/chat/sessions
 *  - POST /api/v1/chat/sessions/{id}/messages/stream (SSE)
 *
 * Components needed:
 *  - Message list (FlatList)
 *  - Message bubble component
 *  - Text input + send button
 *  - SSE streaming handler
 *  - Session selector / new-session button
 */
import { View, Text, SafeAreaView } from "react-native";

export function ChatScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Coach</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Chat with your AI coach</Text>
    </SafeAreaView>
  );
}
