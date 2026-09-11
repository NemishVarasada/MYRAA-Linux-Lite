/**
 * MYRAA — path & secret resolution.
 *
 * Separates read-only *code/asset* locations (shipped with the app) from the
 * writable *data* location (per-user, survives reinstalls). In development both
 * collapse to the project root, so existing behaviour is unchanged. When the
 * packaged Electron app launches the backend it sets MYRAA_DATA_DIR to a
 * writable folder under %APPDATA%\MYRAA, because the install directory
 * (Program Files) is read-only.
 *
 * The Gemini API key is NOT shipped with the app. Each user supplies their own
 * on first run; it is stored here in the per-user data dir (never returned to
 * the frontend).
 */

import fs from "fs";
import path from "path";

/** Writable per-user data directory. Falls back to cwd in development. */
export const DATA_DIR: string = process.env.MYRAA_DATA_DIR || process.cwd();

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch {
  /* already exists / best-effort */
}

/** Absolute path to a file inside the writable data directory. */
export function dataFile(name: string): string {
  return path.join(DATA_DIR, name);
}

// ---------------------------------------------------------------------------
// Gemini API key store (secrets.json in the data dir).
// ---------------------------------------------------------------------------
const SECRETS_FILE = dataFile("secrets.json");

interface Secrets {
  geminiApiKey?: string;
  providerSecrets?: Record<string, string>;
}

function readSecrets(): Secrets {
  try {
    if (fs.existsSync(SECRETS_FILE)) {
      return JSON.parse(fs.readFileSync(SECRETS_FILE, "utf-8")) as Secrets;
    }
  } catch {
    /* corrupt — treat as empty */
  }
  return {};
}

/**
 * Resolve the active Gemini API key.
 * Priority: user-entered key (secrets.json) → environment (.env, dev only).
 */
export function getGeminiApiKey(): string | undefined {
  const stored = readSecrets().geminiApiKey?.trim();
  if (stored) return stored;
  const env = process.env.GEMINI_API_KEY?.trim();
  return env || undefined;
}

/** Whether any usable key is configured (without revealing it). */
export function hasGeminiApiKey(): boolean {
  return Boolean(getGeminiApiKey());
}

/** Persist a user-supplied key to the per-user secrets file. */
export function setGeminiApiKey(key: string): void {
  const trimmed = (key || "").trim();
  if (!trimmed) throw new Error("API key must not be empty.");
  const current = readSecrets();
  current.geminiApiKey = trimmed;
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(current, null, 2), "utf-8");
  try {
    fs.chmodSync(SECRETS_FILE, 0o600); // owner-only where supported
  } catch {
    /* Windows ACLs differ; best-effort */
  }
}

export function getProviderSecret(reference: string): string | undefined {
  const stored = readSecrets().providerSecrets?.[reference]?.trim();
  return stored || process.env[`${reference.toUpperCase()}_API_KEY`]?.trim() || undefined;
}

export function setProviderSecret(reference: string, value: string): void {
  const current = readSecrets();
  current.providerSecrets = { ...(current.providerSecrets || {}), [reference]: value.trim() };
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(current, null, 2), "utf-8");
  try { fs.chmodSync(SECRETS_FILE, 0o600); } catch { /* best effort */ }
}

export function getProviderSettings(): { profiles?: unknown[]; roles?: Record<string, string> } {
  try {
    const value = JSON.parse(fs.readFileSync(dataFile("provider-settings.json"), "utf-8"));
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export function setProviderSettings(settings: { profiles: unknown[]; roles: Record<string, string> }): void {
  fs.writeFileSync(dataFile("provider-settings.json"), JSON.stringify(settings, null, 2), "utf-8");
}

/** Remove the stored key (used by "reset"/sign-out flows). */
export function clearGeminiApiKey(): void {
  const current = readSecrets();
  delete current.geminiApiKey;
  try {
    fs.writeFileSync(SECRETS_FILE, JSON.stringify(current, null, 2), "utf-8");
  } catch {
    /* best-effort */
  }
}
