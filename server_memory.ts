import fs from "node:fs/promises";
import crypto from "node:crypto";
import { dataFile } from "./server_paths";
import type { ChatMessage, ProviderProfile } from "./src/providers/types";
import { chat } from "./src/providers/runtime";

export type MemoryCategory = "identity" | "preference" | "goal" | "project" | "relationship" | "emotional" | "behavior";
export type Memory = { id: string; category: MemoryCategory; text: string; createdAt: string; updatedAt: string };
const file = dataFile("memories.json");

export async function loadMemories(): Promise<Memory[]> {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return []; }
}
export async function saveMemories(memories: Memory[]): Promise<void> {
  await fs.writeFile(file, JSON.stringify(memories, null, 2), { encoding: "utf8", mode: 0o600 });
}
export function withMemories(instruction: string, memories: Memory[]): string {
  const facts = memories.map(memory => `- ${memory.text}`).join("\n");
  return `${instruction}\n\nDurable user memories:\n${facts || "None yet."}`;
}
export async function consolidateMemories(profile: ProviderProfile, providerSecret: string | undefined, dialogue: ChatMessage[]): Promise<Memory[]> {
  const current = await loadMemories();
  const prompt = `Return only JSON with a memories array. Extract only durable facts about the user. Never store passwords, API keys, access tokens, commands, greetings, or temporary information. Allowed categories: identity, preference, goal, project, relationship, emotional, behavior.\n\nDialogue:\n${dialogue.map(item => `${item.role}: ${item.content}`).join("\n")}`;
  const response = await chat(profile, providerSecret, [{ role: "system", content: "You extract durable memories as strict JSON." }, { role: "user", content: prompt }]);
  const parsed = JSON.parse(response.text.replace(/^```json\s*|\s*```$/g, ""));
  const now = new Date().toISOString();
  for (const candidate of parsed.memories || []) {
    const text = String(candidate.text || "").trim();
    if (!text || current.some(memory => memory.text.toLowerCase() === text.toLowerCase())) continue;
    current.push({ id: crypto.randomUUID(), category: candidate.category || "behavior", text: text.slice(0, 500), createdAt: now, updatedAt: now });
  }
  await saveMemories(current.slice(-300));
  return current;
}
