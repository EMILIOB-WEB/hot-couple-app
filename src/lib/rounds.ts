import { supabase } from "./supabase";

export async function createRound({
  roomId,
  category,
  questionId,
  questionText,
  participantId
}: {
  roomId: string;
  category: string;
  questionId: string;
  questionText: string;
  participantId: string;
}) {
  const { data, error } = await supabase
    .from("rounds")
    .insert({
      room_id: roomId,
      category,
      question_id: questionId,
      question_text: questionText,
      created_by: participantId,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function getLatestActiveRound(roomId: string) {
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("room_id", roomId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function saveAnswer({
  roomId,
  roundId,
  participantId,
  answerText
}: {
  roomId: string;
  roundId: string;
  participantId: string;
  answerText: string;
}) {
  const { data, error } = await supabase
    .from("answers")
    .insert({
      room_id: roomId,
      round_id: roundId,
      participant_id: participantId,
      answer_text: answerText
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function getAnswersByRound(roundId: string) {
  const { data, error } = await supabase
    .from("answers")
    .select("*, participants(nickname)")
    .eq("round_id", roundId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function closeRound(roundId: string) {
  const { data, error } = await supabase
    .from("rounds")
    .update({
      is_active: false
    })
    .eq("id", roundId)
    .select()
    .single();

  if (error) throw error;

  return data;
}