import { BlurView } from "expo-blur";
import { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  children: ReactNode;
};

export function GlassCard({ children }: Props) {
  if (Platform.OS === "web") {
    return <View style={styles.webCard}>{children}</View>;
  }

  return (
    <BlurView intensity={32} tint="dark" style={styles.card}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(28,28,30,0.58)"
  },
  webCard: {
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(28,28,30,0.72)",
    // @ts-ignore web only
    backdropFilter: "blur(24px)"
  }
});