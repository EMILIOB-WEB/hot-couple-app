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
        colors={["#15070D", "#050507", "#0C0614"]}
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
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 44
  },
  glowTop: {
    position: "absolute",
    top: -100,
    right: -72,
    width: 230,
    height: 230,
    borderRadius: 230,
    backgroundColor: "rgba(255,59,107,0.18)"
  },
  glowBottom: {
    position: "absolute",
    bottom: -130,
    left: -128,
    width: 300,
    height: 300,
    borderRadius: 300,
    backgroundColor: "rgba(155,108,255,0.13)"
  }
});
