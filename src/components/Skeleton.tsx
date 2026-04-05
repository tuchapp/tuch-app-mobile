/**
 * Skeleton loading components
 *
 * Reusable animated placeholders that pulse opacity while content loads.
 *
 * Exports:
 *  - SkeletonLine: a single pulsing bar (configurable width, height)
 *  - SkeletonCard: a card-shaped skeleton with title line + body lines
 *  - SkeletonList: renders N SkeletonCards vertically
 *  - SkeletonScreen: full screen skeleton with header lines + SkeletonList
 */
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import type { ViewStyle } from "react-native";

// ---------------------------------------------------------------------------
// Pulse hook
// ---------------------------------------------------------------------------

function usePulse(): Animated.Value {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1.0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return opacity;
}

// ---------------------------------------------------------------------------
// SkeletonLine
// ---------------------------------------------------------------------------

type SkeletonLineProps = {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
};

export function SkeletonLine({
  width = "100%",
  height = 14,
  style,
}: SkeletonLineProps) {
  const opacity = usePulse();

  return (
    <Animated.View
      style={[
        styles.line,
        { width: width as number, height, opacity },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// SkeletonCard
// ---------------------------------------------------------------------------

type SkeletonCardProps = {
  lines?: number;
  style?: ViewStyle;
};

export function SkeletonCard({ lines = 3, style }: SkeletonCardProps) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonLine width="60%" height={16} style={{ marginBottom: 12 }} />
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine
          key={i}
          width={i === lines - 1 ? "75%" : "100%"}
          height={12}
          style={{ marginBottom: i < lines - 1 ? 8 : 0 }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// SkeletonList
// ---------------------------------------------------------------------------

type SkeletonListProps = {
  count?: number;
};

export function SkeletonList({ count = 3 }: SkeletonListProps) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// SkeletonScreen
// ---------------------------------------------------------------------------

type SkeletonScreenProps = {
  headerLines?: number;
  cards?: number;
};

export function SkeletonScreen({
  headerLines = 2,
  cards = 3,
}: SkeletonScreenProps) {
  return (
    <View style={styles.screen}>
      {Array.from({ length: headerLines }, (_, i) => (
        <SkeletonLine
          key={`header-${i}`}
          width={i === 0 ? "40%" : "70%"}
          height={i === 0 ? 12 : 22}
          style={{ marginBottom: 8 }}
        />
      ))}
      <View style={{ marginTop: 16 }}>
        <SkeletonList count={cards} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  line: {
    backgroundColor: "#e5e7eb",
    borderRadius: 6,
  },
  card: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  screen: {
    flex: 1,
    padding: 24,
  },
});
