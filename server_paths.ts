import fs from "fs";
import os from "os";
import path from "path";

const defaultRoot = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
export const DATA_DIR = process.env.VAANI_DATA_DIR || path.join(defaultRoot, "Vaani");
fs.mkdirSync(DATA_DIR, { recursive: true });

export function dataFile(name: string): string {
  return path.join(DATA_DIR, name);
}
