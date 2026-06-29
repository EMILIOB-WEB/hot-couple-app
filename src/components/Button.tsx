import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled
      ]}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: colors.border
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.82
  },
  disabled: {
    opacity: 0.45
  },
  text: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700"
  }
});