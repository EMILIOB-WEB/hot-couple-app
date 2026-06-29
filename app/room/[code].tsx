import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Button } from "../../src/components/Button";
import { GlassCard } from "../../src/components/GlassCard";
import { Input } from "../../src/components/Input";
import { Screen } from "../../src/components/Screen";
import { categories } from "../../src/data/categories";
import { getRandomQuestionForUser } from "../../src/lib/questions";
import { colors } from "../../src/theme/colors";
import { Question } from "../../src/types/question";

const QUESTIONS_TO_UNLOCK = 5;

type Progress = {
  unlockedIndex: number;
  answersByCategory: Record<string, number>;
  usedQuestionIdsByCategory: Record<string, string[]>;
};

function getStorageKey(roomCode: string, nickname: string) {
  return `hot-couple-progress-${roomCode}-${nickname.trim().toLowerCase()}`;
}

function createEmptyProgress(): Progress {
  return {
    unlockedIndex: 0,
    answersByCategory: {},
    usedQuestionIdsByCategory: {}
  };
}

function normalizeProgress(progress: Partial<Progress> | null): Progress {
  return {
    unlockedIndex:
      typeof progress?.unlockedIndex === "number" ? progress.unlockedIndex : 0,
    answersByCategory: progress?.answersByCategory ?? {},
    usedQuestionIdsByCategory: progress?.usedQuestionIdsByCategory ?? {}
  };
}

export default function RoomScreen() {
  const params = useLocalSearchParams<{
    code: string;
    nickname?: string;
    owner?: string;
  }>();

  const roomCode = String(params.code ?? "");

  const [nickname, setNickname] = useState(params.nickname ?? "");
  const [joined, setJoined] = useState(Boolean(params.nickname));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");

  const [progress, setProgress] = useState<Progress>(createEmptyProgress());

  const roomUrl = useMemo(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return window.location.href.split("?")[0];
    }

    return `https://tu-dominio.com/room/${roomCode}`;
  }, [roomCode]);

  useEffect(() => {
    if (!joined || !nickname.trim()) return;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const key = getStorageKey(roomCode, nickname);
      const saved = window.localStorage.getItem(key);

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setProgress(normalizeProgress(parsed));
        } catch {
          setProgress(createEmptyProgress());
        }
      } else {
        setProgress(createEmptyProgress());
      }
    }
  }, [joined, nickname, roomCode]);

  const saveProgress = (nextProgress: Progress) => {
    setProgress(nextProgress);

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const key = getStorageKey(roomCode, nickname);
      window.localStorage.setItem(key, JSON.stringify(nextProgress));
    }
  };

  const joinRoom = () => {
    if (!nickname.trim()) {
      Alert.alert("Falta tu apodo", "Escribe tu nombre para entrar.");
      return;
    }

    setNickname(nickname.trim());
    setJoined(true);
  };

  const copyLink = async () => {
    if (Platform.OS === "web" && navigator?.clipboard) {
      await navigator.clipboard.writeText(roomUrl);
      Alert.alert("Link copiado", "Compártelo con tu pareja.");
      return;
    }

    Alert.alert("Link privado", roomUrl);
  };

  const startCategory = (categoryId: string) => {
    const usedIds = progress.usedQuestionIdsByCategory[categoryId] ?? [];
    const question = getRandomQuestionForUser(categoryId, usedIds);

    if (!question) {
      Alert.alert(
        "Sin preguntas nuevas",
        "Ya respondiste todas las preguntas disponibles de esta categoría."
      );
      return;
    }

    setSelectedCategory(categoryId);
    setCurrentQuestion(question);
    setAnswer("");
  };

  const submitAnswer = () => {
    if (!answer.trim() || !currentQuestion || !selectedCategory) {
      Alert.alert("Falta tu respuesta", "Escribe una respuesta para continuar.");
      return;
    }

    const currentCount = progress.answersByCategory[selectedCategory] ?? 0;
    const nextCount = currentCount + 1;

    const selectedIndex = categories.findIndex(
      (category) => category.id === selectedCategory
    );

    let nextUnlockedIndex = progress.unlockedIndex;

    if (
      nextCount >= QUESTIONS_TO_UNLOCK &&
      selectedIndex === progress.unlockedIndex &&
      progress.unlockedIndex < categories.length - 1
    ) {
      nextUnlockedIndex = progress.unlockedIndex + 1;
    }

    const previousUsedIds =
      progress.usedQuestionIdsByCategory[selectedCategory] ?? [];

    const nextProgress: Progress = {
      unlockedIndex: nextUnlockedIndex,
      answersByCategory: {
        ...progress.answersByCategory,
        [selectedCategory]: nextCount
      },
      usedQuestionIdsByCategory: {
        ...progress.usedQuestionIdsByCategory,
        [selectedCategory]: [...previousUsedIds, currentQuestion.id]
      }
    };

    saveProgress(nextProgress);

    Alert.alert(
      "Respuesta guardada",
      nextUnlockedIndex > progress.unlockedIndex
        ? "Nueva etapa desbloqueada."
        : "Respuesta guardada. Sigue respondiendo."
    );

    setCurrentQuestion(null);
    setSelectedCategory(null);
    setAnswer("");
  };

  if (!joined) {
    return (
      <Screen>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SALA PRIVADA</Text>
          <Text style={styles.title}>Entrar a la sala</Text>
          <Text style={styles.subtitle}>Código: {roomCode}</Text>
        </View>

        <GlassCard>
          <View style={styles.form}>
            <Text style={styles.label}>Tu apodo</Text>

            <Input
              value={nickname}
              onChangeText={setNickname}
              placeholder="Ej. Vale"
              autoCapitalize="words"
            />

            <Button title="Entrar" onPress={joinRoom} />
          </View>
        </GlassCard>
      </Screen>
    );
  }

  if (currentQuestion) {
    const category = categories.find((item) => item.id === selectedCategory);
    const answered = progress.answersByCategory[selectedCategory ?? ""] ?? 0;

    return (
      <Screen>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{category?.name}</Text>
          <Text style={styles.title}>Pregunta</Text>
          <Text style={styles.subtitle}>
            Responde mínimo {QUESTIONS_TO_UNLOCK} preguntas para desbloquear la
            siguiente etapa.
          </Text>
        </View>

        <GlassCard>
          <View style={styles.form}>
            <Text style={styles.counter}>
              Progreso: {answered}/{QUESTIONS_TO_UNLOCK}
            </Text>

            <Text style={styles.questionText}>{currentQuestion.text}</Text>

            <Input
              value={answer}
              onChangeText={setAnswer}
              placeholder="Escribe tu respuesta..."
              multiline
            />

            <Button title="Guardar respuesta" onPress={submitAnswer} />

            <Button
              title="Volver"
              variant="secondary"
              onPress={() => {
                setCurrentQuestion(null);
                setSelectedCategory(null);
                setAnswer("");
              }}
            />
          </View>
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SALA {roomCode}</Text>
        <Text style={styles.title}>Hola, {nickname}</Text>
        <Text style={styles.subtitle}>
          Cada etapa se desbloquea al responder mínimo 5 preguntas por persona.
        </Text>
      </View>

      <GlassCard>
        <View style={styles.inviteBox}>
          <Text style={styles.inviteTitle}>Link privado</Text>

          <Text numberOfLines={1} style={styles.inviteUrl}>
            {roomUrl}
          </Text>

          <Button title="Copiar link" onPress={copyLink} variant="secondary" />
        </View>
      </GlassCard>

      <View style={styles.categories}>
        {categories.map((item, index) => {
          const isUnlocked = index <= progress.unlockedIndex;
          const answered = progress.answersByCategory[item.id] ?? 0;

          if (!isUnlocked) {
            return (
              <View key={item.id} style={styles.lockedCategory}>
                <Text style={styles.lockedIcon}>🔒</Text>

                <View style={{ flex: 1 }}>
                  <Text style={styles.lockedTitle}>Etapa bloqueada</Text>
                  <Text style={styles.categoryLevel}>
                    Completa la etapa actual para revelar esta categoría.
                  </Text>
                </View>
              </View>
            );
          }

          return (
            <Pressable
              key={item.id}
              onPress={() => startCategory(item.id)}
              style={({ pressed }) => [
                styles.category,
                pressed && {
                  transform: [{ scale: 0.98 }],
                  opacity: 0.85
                }
              ]}
            >
              <Text style={styles.categoryIcon}>{item.icon}</Text>

              <View style={{ flex: 1 }}>
                <Text style={styles.categoryName}>{item.name}</Text>
                <Text style={styles.categoryLevel}>
                  {answered}/{QUESTIONS_TO_UNLOCK} respuestas
                </Text>
              </View>

              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.7,
    marginBottom: 12
  },
  title: {
    color: colors.text,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "900",
    letterSpacing: -1.4,
    marginBottom: 12
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 23
  },
  form: {
    gap: 16
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700"
  },
  inviteBox: {
    gap: 12
  },
  inviteTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  inviteUrl: {
    color: colors.textMuted,
    fontSize: 13
  },
  categories: {
    gap: 14,
    marginTop: 20
  },
  category: {
    minHeight: 86,
    borderRadius: 26,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border
  },
  lockedCategory: {
    minHeight: 86,
    borderRadius: 26,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    opacity: 0.7
  },
  categoryIcon: {
    fontSize: 32
  },
  lockedIcon: {
    fontSize: 28,
    opacity: 0.7
  },
  categoryName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  },
  lockedTitle: {
    color: colors.textSecondary,
    fontSize: 17,
    fontWeight: "800"
  },
  categoryLevel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 34,
    fontWeight: "300"
  },
  questionText: {
    color: colors.text,
    fontSize: 25,
    lineHeight: 34,
    fontWeight: "800"
  },
  counter: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800"
  }
});