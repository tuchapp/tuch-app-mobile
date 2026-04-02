/**
 * ReviewsScreen
 *
 * API endpoints:
 *  - GET  /api/v1/reviews
 *  - POST /api/v1/reviews/generate
 *
 * Components needed:
 *  - Reviews list
 *  - Review detail card
 *  - Generate-review button
 */
import { View, Text, SafeAreaView } from "react-native";

export function ReviewsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Reviews</Text>
      <Text style={{ marginTop: 8, color: "#666" }}>Weekly accountability reviews</Text>
    </SafeAreaView>
  );
}
