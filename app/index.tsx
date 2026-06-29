import { router } from "expo-router";
import { nanoid } from "nanoid";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "../src/components/Button";
import { GlassCard } from "../src/components/GlassCard";
import { Input } from "../src/components/Input";
import { Screen } from "../src/components/Screen";
import { colors } from "../src/theme/colors";

export default function HomeScreen() {
  const [nickname, setNickname] = useState("");

  const createRoom = () => {
    if (!nickname.trim()) {
      Alert.alert("Falta tu nombre", "Escribe tu apodo para crear la sala.");
      return;
    }

    const roomCode = nanoid(8).toUpperCase();

    router.push({
      pathname: "/room/[code]",
      params: {
        code: roomCode,
        nickname: nickname.trim(),
        owner: "true"
      }
    });
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>PRIVATE COUPLES GAME</Text>
        <Text style={styles.title}>Preguntas hot para dos.</Text>
        <Text style={styles.subtitle}>
          Crea una sala privada, comparte el link y respondan preguntas. Las
          respuestas se revelan solo cuando ambos contesten.
        </Text>
      </View>

      <GlassCard>
        <View style={styles.form}>
          <Text style={styles.label}>Tu apodo</Text>

          <Input
            value={nickname}
            onChangeText={setNickname}
            placeholder="Ej. Emilio"
            autoCapitalize="words"
          />

          <Button title="Crear sala privada" onPress={createRoom} />

          <Text style={styles.note}>
            Sin login. Solo entran mediante link. Máximo 2 personas.
          </Text>
        </View>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: 32
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.8,
    marginBottom: 14
  },
  title: {
    color: colors.text,
    fontSize: 48,
    lineHeight: 52,
    fontWeight: "900",
    letterSpacing: -1.8,
    marginBottom: 16
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 17,
    lineHeight: 25
  },
  form: {
    gap: 16
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700"
  },
  note: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19
  }
});