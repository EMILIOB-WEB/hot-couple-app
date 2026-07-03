import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Button } from "../src/components/Button";
import { GlassCard } from "../src/components/GlassCard";
import { Input } from "../src/components/Input";
import { Screen } from "../src/components/Screen";
import { createRoom } from "../src/lib/rooms";
import { colors } from "../src/theme/colors";

type CreatedRoom = {
  code: string;
  link: string;
};

export default function HomeScreen() {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<CreatedRoom | null>(null);

  const getBaseUrl = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return window.location.origin;
    }

    return "https://hot-couple-app.vercel.app";
  };

  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      Alert.alert("Falta tu nombre", "Escribe tu apodo para crear la sala.");
      return;
    }

    try {
      setLoading(true);

      const room = await createRoom();
      const link = `${getBaseUrl()}/room/${room.code}`;

      setCreatedRoom({
        code: room.code,
        link
      });
    } catch (error) {
      console.log(error);

      Alert.alert("Error", "No se pudo crear la sala. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!createdRoom) return;

    if (Platform.OS === "web" && navigator?.clipboard) {
      await navigator.clipboard.writeText(createdRoom.link);
      Alert.alert("Link copiado", "Mándaselo a tu pareja.");
      return;
    }

    Alert.alert("Link de sala", createdRoom.link);
  };

  const enterRoom = () => {
    if (!createdRoom) return;

    router.push({
      pathname: "/room/[code]",
      params: {
        code: createdRoom.code,
        nickname: nickname.trim(),
        owner: "true"
      }
    });
  };

  if (createdRoom) {
    return (
      <Screen>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.eyebrow}>SALA CREADA</Text>
          </View>

          <Text style={styles.title}>Comparte este link.</Text>

          <Text style={styles.subtitle}>
            Tu pareja debe entrar usando este enlace. Si entra al link principal,
            se creará una sala diferente.
          </Text>
        </View>

        <GlassCard>
          <View style={styles.form}>
            <Text style={styles.label}>Link privado de la sala</Text>

            <View style={styles.linkBox}>
              <Text selectable numberOfLines={3} style={styles.linkText}>
                {createdRoom.link}
              </Text>
            </View>

            <Button title="Copiar link" onPress={copyLink} />

            <Button
              title="Entrar a mi sala"
              onPress={enterRoom}
              variant="secondary"
            />

            <Text style={styles.note}>
              Solo este link abre la misma sala. Máximo 2 personas.
            </Text>
          </View>
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.brandMark}>
          <View style={styles.brandMarkCore} />
        </View>

        <View style={styles.badge}>
          <Text style={styles.eyebrow}>PRIVATE COUPLES GAME</Text>
        </View>

        <Text style={styles.title}>Preguntas hot{"\n"}para dos.</Text>

        <Text style={styles.subtitle}>
          Crea una sala privada, copia el link y mándaselo a tu pareja. Ambos
          entran a la misma sala usando ese enlace.
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
            editable={!loading}
          />

          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loaderText}>Creando sala privada...</Text>
            </View>
          ) : (
            <Button title="Crear sala privada" onPress={handleCreateRoom} />
          )}

          <Text style={styles.note}>
            Sin login • Solo por invitación • Máximo 2 personas
          </Text>
        </View>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: 28,
    paddingTop: 14
  },
  brandMark: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18
  },
  brandMarkCore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    marginBottom: 20
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4
  },
  title: {
    color: colors.text,
    fontSize: 44,
    lineHeight: 48,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 16
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 25,
    maxWidth: 440
  },
  form: {
    gap: 18
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  note: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "700"
  },
  loaderContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingVertical: 20
  },
  loaderText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600"
  },
  linkBox: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.065)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)"
  },
  linkText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  }
});
