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
    borderRadius: 24,
    padding: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(17,17,22,0.72)"
  },
  webCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(17,17,22,0.78)",
    // @ts-ignore web only
    backdropFilter: "blur(28px)",
    // @ts-ignore web only
    boxShadow: "0 24px 70px rgba(0,0,0,0.38)"
  }
});
