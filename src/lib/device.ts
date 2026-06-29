import { nanoid } from "nanoid";

export function getParticipantToken() {
  if (typeof window === "undefined") {
    return nanoid();
  }

  let token = localStorage.getItem("participant-token");

  if (!token) {
    token = nanoid();
    localStorage.setItem("participant-token", token);
  }

  return token;
}