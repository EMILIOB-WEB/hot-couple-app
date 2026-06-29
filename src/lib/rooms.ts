import { nanoid } from "nanoid";
import { supabase } from "./supabase";

export async function createRoom() {
  const code = nanoid(8).toUpperCase();

  const { data, error } = await supabase
    .from("rooms")
    .insert({ code })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function getRoomByCode(code: string) {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .single();

  if (error) throw error;

  return data;
}

export async function getParticipants(roomId: string) {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("room_id", roomId)
    .eq("is_online", true)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function joinRoom(
  roomId: string,
  nickname: string,
  participantToken: string
) {
  const { data: existingParticipant, error: existingError } = await supabase
    .from("participants")
    .select("*")
    .eq("room_id", roomId)
    .eq("participant_token", participantToken)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingParticipant) {
    const { data, error } = await supabase
      .from("participants")
      .update({
        nickname,
        is_online: true,
        last_seen: new Date().toISOString()
      })
      .eq("id", existingParticipant.id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  const onlineParticipants = await getParticipants(roomId);

  if (onlineParticipants.length >= 2) {
    throw new Error("La sala ya está llena.");
  }

  const { data, error } = await supabase
    .from("participants")
    .insert({
      room_id: roomId,
      nickname,
      participant_token: participantToken,
      is_online: true,
      last_seen: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function markParticipantOnline(participantId: string) {
  const { data, error } = await supabase
    .from("participants")
    .update({
      is_online: true,
      last_seen: new Date().toISOString()
    })
    .eq("id", participantId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function markParticipantOffline(participantId: string) {
  const { data, error } = await supabase
    .from("participants")
    .update({
      is_online: false,
      last_seen: new Date().toISOString()
    })
    .eq("id", participantId)
    .select()
    .single();

  if (error) throw error;

  return data;
}