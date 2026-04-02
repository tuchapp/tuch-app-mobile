/**
 * ReviewsScreen — Weekly accountability reviews
 *
 * API endpoints:
 *  - GET  /api/v1/reviews
 *  - POST /api/v1/reviews/generate
 */
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiGet, apiPost } from "../lib/api";
import { formatDate } from "../utils/format-date";
import type { ApiEnvelope, WeeklyReview } from "../types/api-types";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReviewsScreen() {
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      const payload = await apiGet<ApiEnvelope<WeeklyReview[]>>("/api/v1/reviews");
      const data = payload.data ?? [];
      // Sort newest first
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setReviews(data);
    } catch {
      // Fail gracefully
    }
  }, []);

  useEffect(() => {
    fetchReviews().finally(() => setLoading(false));
  }, [fetchReviews]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReviews();
    setRefreshing(false);
  }, [fetchReviews]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await apiPost("/api/v1/reviews/generate");
      await fetchReviews();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not generate review.");
    } finally {
      setGenerating(false);
    }
  };

  const latestReview = reviews[0] ?? null;
  const olderReviews = reviews.slice(1);

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
      >
        <Text style={s.screenTitle}>Reviews</Text>

        {/* ── Latest review ── */}
        <View style={s.sectionHeader}>
          <View>
            <Text style={s.sectionEyebrow}>ACCOUNTABILITY REVIEW</Text>
            <Text style={s.sectionTitle}>Weekly review</Text>
          </View>
          <Pressable
            style={[s.generateButton, generating && s.buttonDisabled]}
            onPress={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color={BRAND} size="small" />
            ) : (
              <Text style={s.generateButtonText}>Generate new</Text>
            )}
          </Pressable>
        </View>

        {latestReview ? (
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <View style={s.cardHeaderLeft}>
                <Text style={s.cardTitle}>{latestReview.title || "Weekly review"}</Text>
                <Text style={s.cardMeta}>
                  {latestReview.period_start} - {latestReview.period_end}
                </Text>
              </View>
              <View style={s.pill}>
                <Text style={s.pillText}>{formatDate(latestReview.created_at)}</Text>
              </View>
            </View>

            <Text style={s.summaryText}>{latestReview.summary_text}</Text>

            {latestReview.recommendations.length > 0 && (
              <View style={s.recsContainer}>
                <Text style={s.recsLabel}>Actions for this week</Text>
                {latestReview.recommendations.map((rec, i) => (
                  <View key={i} style={s.recItem}>
                    <Text style={s.recBullet}>{"\u2022"}</Text>
                    <Text style={s.recText}>{rec}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={s.emptyState}>
            <Text style={s.emptyText}>
              Generate your first review to see an accountability summary of the week.
            </Text>
          </View>
        )}

        {/* ── Older reviews ── */}
        {olderReviews.length > 0 && (
          <>
            <Text style={[s.sectionEyebrow, { marginTop: 32 }]}>HISTORY</Text>
            <Text style={s.sectionTitle}>Recent reviews</Text>

            {olderReviews.map((review) => (
              <View key={review.id} style={s.card}>
                <View style={s.cardHeaderRow}>
                  <View style={s.cardHeaderLeft}>
                    <Text style={s.cardTitle}>{review.title || "Weekly review"}</Text>
                    <Text style={s.cardMeta}>
                      {review.period_start} - {review.period_end}
                    </Text>
                  </View>
                  <View style={s.pill}>
                    <Text style={s.pillText}>{formatDate(review.created_at)}</Text>
                  </View>
                </View>

                <Text style={s.summaryText}>{review.summary_text}</Text>

                {review.recommendations.length > 0 && (
                  <View style={s.recsContainer}>
                    {review.recommendations.slice(0, 2).map((rec, i) => (
                      <View key={i} style={s.recItem}>
                        <Text style={s.recBullet}>{"\u2022"}</Text>
                        <Text style={s.recText}>{rec}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {reviews.length > 0 && olderReviews.length === 0 && (
          <View style={[s.emptyState, { marginTop: 24 }]}>
            <Text style={s.emptyText}>Your recent reviews will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BRAND = "#7e22ce";

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 28, fontWeight: "700", color: "#111", marginBottom: 24 },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  sectionEyebrow: { fontSize: 12, fontWeight: "600", color: BRAND, letterSpacing: 1, marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 12 },

  generateButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  generateButtonText: { fontSize: 13, color: BRAND, fontWeight: "500" },
  buttonDisabled: { opacity: 0.6 },

  // Cards
  card: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  cardHeaderLeft: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#111" },
  cardMeta: { fontSize: 12, color: "#999", marginTop: 2 },
  pill: {
    backgroundColor: "rgba(126, 34, 206, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: { fontSize: 12, color: BRAND, fontWeight: "500" },

  summaryText: { fontSize: 14, color: "#666", lineHeight: 21, marginBottom: 8 },

  // Recommendations
  recsContainer: { marginTop: 4, gap: 4 },
  recsLabel: { fontSize: 13, fontWeight: "600", color: "#333", marginBottom: 4 },
  recItem: { flexDirection: "row", gap: 6 },
  recBullet: { fontSize: 14, color: BRAND, lineHeight: 21 },
  recText: { fontSize: 14, color: "#555", lineHeight: 21, flex: 1 },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: 32 },
  emptyText: { fontSize: 14, color: "#999", textAlign: "center", lineHeight: 22 },
});
