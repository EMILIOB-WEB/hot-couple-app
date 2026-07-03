import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
import { getParticipantToken } from "../../src/lib/device";
import { getRandomQuestionForUser } from "../../src/lib/questions";
import {
  getParticipants,
  getRoomByCode,
  joinRoom as joinRoomInSupabase,
  markParticipantOffline
} from "../../src/lib/rooms";
import {
  closeRound,
  createRound,
  getAnswersByRound,
  getLatestActiveRound,
  saveAnswer
} from "../../src/lib/rounds";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/theme/colors";

const QUESTIONS_TO_UNLOCK = 5;

type Progress = {
  unlockedIndex: number;
  answersByCategory: Record<string, number>;
  usedQuestionIdsByCategory: Record<string, string[]>;
  completedRoundIds: string[];
};

type Round = {
  id: string;
  room_id: string;
  category: string;
  question_id: string;
  question_text: string;
  created_by: string;
  is_active: boolean;
};

type Answer = {
  id: string;
  answer_text: string;
  participant_id: string;
  participants?: {
    nickname: string;
  };
};

function getStorageKey(roomCode: string, nickname: string) {
  return `hot-couple-progress-${roomCode}-${nickname.trim().toLowerCase()}`;
}

function createEmptyProgress(): Progress {
  return {
    unlockedIndex: 0,
    answersByCategory: {},
    usedQuestionIdsByCategory: {},
    completedRoundIds: []
  };
}

function normalizeProgress(progress: Partial<Progress> | null): Progress {
  return {
    unlockedIndex:
      typeof progress?.unlockedIndex === "number" ? progress.unlockedIndex : 0,
    answersByCategory: progress?.answersByCategory ?? {},
    usedQuestionIdsByCategory: progress?.usedQuestionIdsByCategory ?? {},
    completedRoundIds: Array.isArray(progress?.completedRoundIds)
      ? progress.completedRoundIds
      : []
  };
}

export default function RoomScreen() {
  const params = useLocalSearchParams<{
    code: string;
    nickname?: string;
  }>();

  const roomCode = String(params.code ?? "");

  const [nickname, setNickname] = useState(params.nickname ?? "");
  const [joined, setJoined] = useState(false);
  const [answer, setAnswer] = useState("");

  const [participants, setParticipants] = useState<any[]>([]);
  const [roomId, setRoomId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [loadingJoin, setLoadingJoin] = useState(false);

  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [savingAnswer, setSavingAnswer] = useState(false);

  const [progress, setProgress] = useState<Progress>(createEmptyProgress());
  const [progressLoaded, setProgressLoaded] = useState(false);

  const hasAnswered = answers.some(
    (item) => item.participant_id === participantId
  );
  const answeredParticipantIds = new Set(
    answers.map((item) => item.participant_id)
  );
  const bothAnswered = answeredParticipantIds.size >= 2;

  const category = activeRound
    ? categories.find((item) => item.id === activeRound.category)
    : null;

  useEffect(() => {
    if (!joined || !nickname.trim()) return;

    setProgressLoaded(false);

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const key = getStorageKey(roomCode, nickname);
      const saved = window.localStorage.getItem(key);

      if (saved) {
        try {
          setProgress(normalizeProgress(JSON.parse(saved)));
        } catch {
          setProgress(createEmptyProgress());
        }
      } else {
        setProgress(createEmptyProgress());
      }

      setProgressLoaded(true);
      return;
    }

    setProgress(createEmptyProgress());
    setProgressLoaded(true);
  }, [joined, nickname, roomCode]);

  useEffect(() => {
  if (!participantId) return;

  const markOffline = async () => {
    try {
      await markParticipantOffline(participantId);
    } catch (error) {
      console.log("Error marcando participante offline:", error);
    }
  };

  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.addEventListener("beforeunload", markOffline);

    return () => {
      markOffline();
      window.removeEventListener("beforeunload", markOffline);
    };
  }

  return () => {
    markOffline();
  };
}, [participantId]);


  useEffect(() => {
    const autoJoinOwner = async () => {
      if (!params.nickname || joined) return;
      await handleJoinRoom(String(params.nickname));
    };

    autoJoinOwner();
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `room_id=eq.${roomId}`
        },
        async () => {
          const nextParticipants = await getParticipants(roomId);
          setParticipants(nextParticipants);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rounds",
          filter: `room_id=eq.${roomId}`
        },
        async () => {
          const latestRound = await getLatestActiveRound(roomId);
          setActiveRound(latestRound);

          if (latestRound) {
            const nextAnswers = await getAnswersByRound(latestRound.id);
            setAnswers(nextAnswers);
          } else {
            setAnswers([]);
            setAnswer("");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (!activeRound?.id) return;

    const channel = supabase
      .channel(`answers-${activeRound.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "answers",
          filter: `round_id=eq.${activeRound.id}`
        },
        async () => {
          const nextAnswers = await getAnswersByRound(activeRound.id);
          setAnswers(nextAnswers);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRound?.id]);

  const saveProgress = (nextProgress: Progress) => {
    setProgress(nextProgress);

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const key = getStorageKey(roomCode, nickname);
      window.localStorage.setItem(key, JSON.stringify(nextProgress));
    }
  };

  const handleJoinRoom = async (nicknameOverride?: string) => {
    const finalNickname = (nicknameOverride ?? nickname).trim();

    if (!finalNickname) {
      Alert.alert("Falta tu apodo", "Escribe tu nombre para entrar.");
      return;
    }

    try {
      setLoadingJoin(true);

      const room = await getRoomByCode(roomCode);
      const participant = await joinRoomInSupabase(
        room.id,
        finalNickname,
        getParticipantToken()
      );

      const roomParticipants = await getParticipants(room.id);
      const latestRound = await getLatestActiveRound(room.id);

      setRoomId(room.id);
      setParticipantId(participant.id);
      setParticipants(roomParticipants);
      setNickname(participant.nickname);
      setActiveRound(latestRound);

      if (latestRound) {
        const nextAnswers = await getAnswersByRound(latestRound.id);
        setAnswers(nextAnswers);
      }

      setJoined(true);
    } catch (error: any) {
      console.log(error);

      Alert.alert(
        "No se pudo entrar",
        error.message || "La sala no está disponible."
      );
    } finally {
      setLoadingJoin(false);
    }
  };

  const startCategory = async (categoryId: string) => {
    if (!roomId || !participantId) {
      Alert.alert("Espera", "Todavía no se ha cargado la sala.");
      return;
    }

    if (activeRound) {
      Alert.alert(
        "Ronda activa",
        "Ya hay una pregunta activa. Primero respondan o continúen."
      );
      return;
    }

    const usedIds = progress.usedQuestionIdsByCategory[categoryId] ?? [];
    const question = getRandomQuestionForUser(categoryId, usedIds);

    if (!question) {
      Alert.alert(
        "Sin preguntas nuevas",
        "Ya respondiste todas las preguntas disponibles de esta categoría."
      );
      return;
    }

    try {
      const round = await createRound({
        roomId,
        category: categoryId,
        questionId: question.id,
        questionText: question.text,
        participantId
      });

      setActiveRound(round);
      setAnswers([]);
      setAnswer("");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo crear la ronda.");
    }
  };

  const updateLocalProgressAfterCompletedRound = () => {
    if (!activeRound || progress.completedRoundIds.includes(activeRound.id)) {
      return;
    }

    const selectedCategory = activeRound.category;
    const currentCount = progress.answersByCategory[selectedCategory] ?? 0;
    const nextCount = currentCount + 1;

    const selectedIndex = categories.findIndex(
      (item) => item.id === selectedCategory
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
        [selectedCategory]: [...previousUsedIds, activeRound.question_id]
      },
      completedRoundIds: [...progress.completedRoundIds, activeRound.id]
    };

    saveProgress(nextProgress);
  };

  useEffect(() => {
    if (!progressLoaded || !activeRound || !hasAnswered || !bothAnswered) {
      return;
    }

    updateLocalProgressAfterCompletedRound();
  }, [
    progressLoaded,
    activeRound?.id,
    answers.length,
    hasAnswered,
    bothAnswered
  ]);

  const submitAnswer = async () => {
    if (!answer.trim() || !activeRound || !roomId || !participantId) {
      Alert.alert("Falta tu respuesta", "Escribe una respuesta para continuar.");
      return;
    }

    try {
      setSavingAnswer(true);

      await saveAnswer({
        roomId,
        roundId: activeRound.id,
        participantId,
        answerText: answer.trim()
      });

      const nextAnswers = await getAnswersByRound(activeRound.id);
      setAnswers(nextAnswers);
      setAnswer("");
    } catch (error: any) {
      console.log(error);

      Alert.alert(
        "No se pudo guardar",
        error.message || "Intenta nuevamente."
      );
    } finally {
      setSavingAnswer(false);
    }
  };

  const handleContinue = async () => {
    if (!activeRound) return;

    try {
      await closeRound(activeRound.id);
      setActiveRound(null);
      setAnswers([]);
      setAnswer("");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo cerrar la ronda.");
    }
  };

  if (!joined) {
    return (
      <Screen>
        <View style={styles.heroHeader}>
          <View style={styles.appPill}>
            <Text style={styles.appPillText}>PRIVATE COUPLE ROOM</Text>
          </View>

          <Text style={styles.heroTitle}>Entrar a la sala</Text>

          <Text style={styles.heroSubtitle}>
            Usa tu apodo. Esta sala es solo para dos personas mediante link.
          </Text>
        </View>

        <GlassCard>
          <View style={styles.form}>
            <Text style={styles.label}>Tu apodo</Text>

            <Input
              value={nickname}
              onChangeText={setNickname}
              placeholder="Ej. Vale"
              autoCapitalize="words"
              editable={!loadingJoin}
            />

            <Button
              title={loadingJoin ? "Entrando..." : "Entrar"}
              onPress={() => handleJoinRoom()}
              disabled={loadingJoin}
            />

            <Text style={styles.safeNote}>
              Sin login. Tu progreso se guarda en este navegador.
            </Text>
          </View>
        </GlassCard>
      </Screen>
    );
  }

  if (activeRound) {
    const answered = progress.answersByCategory[activeRound.category] ?? 0;
    const progressPercent = Math.min(answered / QUESTIONS_TO_UNLOCK, 1) * 100;
    return (
      <Screen>
        <View style={styles.questionHeader}>
          <Pressable
            onPress={() => {
              Alert.alert(
                "Ronda activa",
                "Espera a que ambos respondan antes de volver a las etapas."
              );
            }}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.questionEyebrow}>{category?.name}</Text>
            <Text style={styles.questionTitle}>Pregunta privada</Text>
          </View>
        </View>

        <View style={styles.progressBox}>
          <View style={styles.progressTop}>
            <Text style={styles.progressLabel}>Progreso de etapa</Text>
            <Text style={styles.progressValue}>
              {answered}/{QUESTIONS_TO_UNLOCK}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`
                }
              ]}
            />
          </View>
        </View>

        <View style={styles.questionCard}>
          <View style={styles.questionBadge}>
            <Text style={styles.questionBadgeText}>
              {bothAnswered ? "RESPUESTAS REVELADAS" : "RESPONDE CON HONESTIDAD"}
            </Text>
          </View>

          <Text style={styles.questionText}>{activeRound.question_text}</Text>

          {!hasAnswered && (
            <>
              <Input
                value={answer}
                onChangeText={setAnswer}
                placeholder="Escribe tu respuesta..."
                multiline
              />

              <Button
                title={savingAnswer ? "Guardando..." : "Guardar respuesta"}
                onPress={submitAnswer}
                disabled={savingAnswer}
              />
            </>
          )}

          {hasAnswered && !bothAnswered && (
            <View style={styles.waitingBox}>
              <Text style={styles.waitingTitle}>Respuesta guardada</Text>
              <Text style={styles.waitingText}>
                Esperando a que tu pareja responda para revelar ambas respuestas.
              </Text>
            </View>
          )}

          {bothAnswered && (
            <View style={styles.answersList}>
              {answers.map((item) => (
                <View key={item.id} style={styles.answerCard}>
                  <Text style={styles.answerName}>
                    {item.participants?.nickname ?? "Pareja"}
                  </Text>
                  <Text style={styles.answerText}>{item.answer_text}</Text>
                </View>
              ))}

              <Button title="Continuar" onPress={handleContinue} />
            </View>
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.homeHeader}>
        <View style={styles.roomPill}>
          <Text style={styles.roomPillText}>SALA {roomCode}</Text>
        </View>

        <Text style={styles.homeTitle}>Hola, {nickname}</Text>

        <Text style={styles.homeSubtitle}>
          Responde 5 preguntas para revelar la siguiente etapa. Las etapas
          bloqueadas no muestran su nombre.
        </Text>

        <View style={styles.participantsRow}>
          {participants.map((participant) => (
            <View key={participant.id} style={styles.participantPill}>
              <Text style={styles.participantText}>
                {participant.nickname}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.stageSummary}>
        <View>
          <Text style={styles.summaryLabel}>Etapa actual</Text>
          <Text style={styles.summaryValue}>{progress.unlockedIndex + 1}</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View>
          <Text style={styles.summaryLabel}>Para desbloquear</Text>
          <Text style={styles.summaryValue}>{QUESTIONS_TO_UNLOCK}</Text>
        </View>
      </View>

      <View style={styles.categories}>
        {categories.map((item, index) => {
          const isUnlocked = index <= progress.unlockedIndex;
          const answered = progress.answersByCategory[item.id] ?? 0;
          const percent = Math.min(answered / QUESTIONS_TO_UNLOCK, 1) * 100;

          if (!isUnlocked) {
            return (
              <View key={item.id} style={styles.lockedCard}>
                <View style={styles.lockedTop}>
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedBadgeText}>BLOQUEADA</Text>
                  </View>

                  <View style={styles.lockIconBox}>
                    <Text style={styles.lockIcon}>🔒</Text>
                  </View>
                </View>

                <Text style={styles.lockedTitle}>Etapa oculta</Text>

                <Text style={styles.lockedDescription}>
                  Completa la etapa actual para revelar esta categoría.
                </Text>
              </View>
            );
          }

          return (
            <Pressable
              key={item.id}
              onPress={() => startCategory(item.id)}
              style={({ pressed }) => [
                styles.premiumCard,
                pressed && styles.cardPressed
              ]}
            >
              <View style={styles.cardGlow} />

              <View style={styles.cardTop}>
                <View style={styles.stageBadge}>
                  <Text style={styles.stageBadgeText}>ETAPA {index + 1}</Text>
                </View>

                <View style={styles.counterPill}>
                  <Text style={styles.counterPillText}>
                    {answered}/{QUESTIONS_TO_UNLOCK}
                  </Text>
                </View>
              </View>

              <View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardDescription}>
                  Toca para crear una pregunta compartida.
                </Text>
              </View>

              <View>
                <View style={styles.miniProgressTrack}>
                  <View
                    style={[
                      styles.miniProgressFill,
                      {
                        width: `${percent}%`
                      }
                    ]}
                  />
                </View>

                <View style={styles.cardBottom}>
                  <View style={styles.answerPill}>
                    <Text style={styles.answerPillText}>Iniciar ronda</Text>
                    <Text style={styles.answerArrow}>››</Text>
                  </View>

                  <View style={styles.actionCircle}>
                    <Text style={styles.actionIcon}>↗</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroHeader: {
    marginBottom: 26,
    paddingTop: 10
  },
  appPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    marginBottom: 18
  },
  appPillText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4
  },
  heroTitle: {
    color: colors.text,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: "900",
    letterSpacing: 0
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14
  },
  form: { gap: 16 },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  safeNote: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center"
  },
  homeHeader: {
    marginBottom: 22,
    paddingTop: 8
  },
  roomPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.075)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    marginBottom: 16
  },
  roomPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5
  },
  homeTitle: {
    color: colors.text,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: 0
  },
  homeSubtitle: {
    color: colors.textSecondary,
    fontSize: 15.5,
    lineHeight: 23,
    marginTop: 12
  },
  participantsRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  participantPill: {
    backgroundColor: "rgba(255,255,255,0.075)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)"
  },
  participantText: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 13
  },
  stageSummary: {
    height: 84,
    borderRadius: 22,
    paddingHorizontal: 22,
    marginBottom: 24,
    backgroundColor: "rgba(255,255,255,0.065)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6
  },
  summaryValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900"
  },
  summaryDivider: {
    width: 1,
    height: 42,
    backgroundColor: "rgba(255,255,255,0.12)"
  },
  categories: { gap: 16 },
  premiumCard: {
    minHeight: 214,
    borderRadius: 24,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.075)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
    justifyContent: "space-between",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 28
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92
  },
  cardGlow: {
    position: "absolute",
    right: -54,
    top: -80,
    width: 190,
    height: 190,
    borderRadius: 190,
    backgroundColor: "rgba(255,59,107,0.2)"
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  stageBadge: {
    paddingHorizontal: 13,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(246,193,119,0.16)",
    borderWidth: 1,
    borderColor: "rgba(246,193,119,0.32)",
    justifyContent: "center",
    alignItems: "center"
  },
  stageBadgeText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8
  },
  counterPill: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center"
  },
  counterPillText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900"
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "900",
    letterSpacing: 0,
    maxWidth: 310
  },
  cardDescription: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8
  },
  miniProgressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    marginBottom: 14
  },
  miniProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  answerPill: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(255,59,107,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,59,107,0.28)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  answerPillText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900"
  },
  answerArrow: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900"
  },
  actionCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center"
  },
  actionIcon: {
    color: "#161017",
    fontSize: 22,
    fontWeight: "900"
  },
  lockedCard: {
    minHeight: 184,
    borderRadius: 24,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "space-between",
    opacity: 0.82
  },
  lockedTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  lockedBadge: {
    paddingHorizontal: 13,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.075)",
    justifyContent: "center"
  },
  lockedBadgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1
  },
  lockIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.075)",
    justifyContent: "center",
    alignItems: "center"
  },
  lockIcon: { fontSize: 18 },
  lockedTitle: {
    color: colors.textSecondary,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
    letterSpacing: 0
  },
  lockedDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 22
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.075)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center"
  },
  backButtonText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  questionEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 4
  },
  questionTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0
  },
  progressBox: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.065)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    marginBottom: 18
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800"
  },
  progressValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900"
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary
  },
  questionCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.075)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    gap: 18
  },
  questionBadge: {
    alignSelf: "flex-start",
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,45,85,0.16)",
    justifyContent: "center"
  },
  questionBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.9
  },
  questionText: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 33,
    fontWeight: "900",
    letterSpacing: 0
  },
  waitingBox: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    gap: 6
  },
  waitingTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  waitingText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  answersList: {
    gap: 14
  },
  answerCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.065)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    gap: 8
  },
  answerName: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900"
  },
  answerText: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700"
  }
});
