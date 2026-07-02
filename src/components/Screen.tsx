import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  children: ReactNode;
};

export function Screen({ children }: Props) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#160008", "#000000", "#090012"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.background,
    overflow: "hidden"
  },
  scroller: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    minHeight: "100%",
    paddingHorizontal: 22,
    paddingTop: 56,
    paddingBottom: 40
  },
  glowTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: "rgba(255,45,85,0.26)"
  },
  glowBottom: {
    position: "absolute",
    bottom: -160,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 320,
    backgroundColor: "rgba(191,90,242,0.18)"
  }
});
