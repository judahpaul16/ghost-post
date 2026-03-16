import type { CustomPageConfig } from "@/types";

export interface Settings {
  pdlApiKey: string;
  jsearchApiKey: string;
  llmApiKey: string;
  llmBaseUrl: string;
  llmModel: string;
  customPages: CustomPageConfig[];
}

const DEFAULTS: Settings = {
  pdlApiKey: "",
  jsearchApiKey: "",
  llmApiKey: "",
  llmBaseUrl: "",
  llmModel: "gpt-4o-mini",
  customPages: [],
};

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  return stored as Settings;
}

export async function saveSettings(
  settings: Partial<Settings>
): Promise<void> {
  await chrome.storage.sync.set(settings);
}
