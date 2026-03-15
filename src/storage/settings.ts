import type { CustomPageConfig } from "@/types";

export interface Settings {
  pdlApiKey: string;
  airtableApiKey: string;
  airtableBaseId: string;
  jsearchApiKey: string;
  customPages: CustomPageConfig[];
}

const DEFAULTS: Settings = {
  pdlApiKey: "",
  airtableApiKey: "",
  airtableBaseId: "",
  jsearchApiKey: "",
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
