import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { colors } from "../theme/colors";

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={styles.input}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 58,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.065)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    color: colors.text,
    fontSize: 16,
    fontWeight: "700"
  }
});
