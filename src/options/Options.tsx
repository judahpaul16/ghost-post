import { useState, useEffect } from "react";
import { getSettings, saveSettings, type Settings } from "@/storage/settings";
import type { CustomPageConfig } from "@/types";
import { CustomPageEditor } from "./components/CustomPageEditor";

function ApiKeyField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-medium text-zinc-400">
        {label}
      </label>
      <div className="relative group">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all font-mono"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors font-sans"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-purple-400/80 hover:text-purple-300 transition-colors underline underline-offset-2"
    >
      {children}
    </a>
  );
}

export default function Options() {
  const [settings, setSettings] = useState<Settings>({
    pdlApiKey: "",
    jsearchApiKey: "",
    llmApiKey: "",
    llmBaseUrl: "",
    llmModel: "gpt-4o-mini",
    customPages: [],
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  useEffect(() => {
    if (!settings.llmBaseUrl || !settings.llmApiKey) {
      setAvailableModels([]);
      return;
    }

    const controller = new AbortController();
    setModelsLoading(true);

    fetch(`${settings.llmBaseUrl}/models`, {
      headers: { Authorization: `Bearer ${settings.llmApiKey}` },
      signal: controller.signal,
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        const NON_CHAT = /^(tts-|whisper-|dall-e|davinci|babbage|text-embedding|text-moderation|omni-moderation|sora-|chatgpt-image|gpt-audio|gpt-image|gpt-realtime)|-(instruct|realtime|audio-preview|transcribe|tts|search-preview|search-api|codex|deep-research)/;
        const ids: string[] = (data.data ?? [])
          .map((m: { id: string }) => m.id)
          .filter((id: string) => !NON_CHAT.test(id))
          .sort((a: string, b: string) => a.localeCompare(b));
        setAvailableModels(ids);
      })
      .catch(() => setAvailableModels([]))
      .finally(() => setModelsLoading(false));

    return () => controller.abort();
  }, [settings.llmBaseUrl, settings.llmApiKey]);

  const updateField = (field: keyof Omit<Settings, "customPages">) => (value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const updateCustomPages = (pages: CustomPageConfig[]) => {
    setSettings((prev) => ({ ...prev, customPages: pages }));
    setSaved(false);
  };

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-purple-400">
              <path d="M12 2C7.6 2 4 5.6 4 10v10.5c0 .6.4.8.9.5l2.1-2.1 2.1 2.1c.3.3.9.3 1.2 0L12 19.4l1.7 1.6c.3.3.9.3 1.2 0l2.1-2.1 2.1 2.1c.5.3.9.1.9-.5V10c0-4.4-3.6-8-8-8zM9 12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
            </svg>
            <h1 className="text-[15px] font-semibold text-zinc-100 tracking-tight">Ghost Post Settings</h1>
          </div>
          <button
            onClick={handleSave}
            className={`px-5 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
              saved
                ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20"
            }`}
          >
            {saved ? "Saved" : "Save"}
          </button>
        </header>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <section className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <h2 className="text-[12px] font-semibold text-zinc-300">People Data Labs</h2>
            </div>
            <p className="text-[10px] text-zinc-600 mb-3">
              Company size and employee count data. Free: 100/month.
              {" "}<ExternalLink href="https://dashboard.peopledatalabs.com/api-keys">Get API key</ExternalLink>
            </p>
            <ApiKeyField
              label="API Key"
              value={settings.pdlApiKey}
              onChange={updateField("pdlApiKey")}
              placeholder="pdl_live_..."
            />
          </section>

          <section className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <h2 className="text-[12px] font-semibold text-zinc-300">JSearch (RapidAPI)</h2>
            </div>
            <p className="text-[10px] text-zinc-600 mb-3">
              Cross-reference listings across job platforms. Free: 500/month.
              {" "}<ExternalLink href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch">Subscribe on RapidAPI</ExternalLink>
            </p>
            <ApiKeyField
              label="API Key"
              value={settings.jsearchApiKey}
              onChange={updateField("jsearchApiKey")}
              placeholder="rapid_api_..."
            />
          </section>

          <section className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <h2 className="text-[12px] font-semibold text-zinc-300">LLM (Headcount Trend)</h2>
            </div>
            <p className="text-[10px] text-zinc-600 mb-3">
              Improves employee count extraction from SEC 10-K filings. Works without a key via regex fallback.
              {" "}<ExternalLink href="https://docs.litellm.ai/docs/providers">Supported providers</ExternalLink>
            </p>
            <div className="space-y-2">
              <ApiKeyField
                label="API Key"
                value={settings.llmApiKey}
                onChange={updateField("llmApiKey")}
                placeholder="sk-..."
              />
              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-zinc-400">Base URL</label>
                <input
                  type="text"
                  value={settings.llmBaseUrl}
                  onChange={(e) => updateField("llmBaseUrl")(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-zinc-400">
                  Model{modelsLoading ? " (loading...)" : ""}
                </label>
                {availableModels.length > 0 ? (
                  <select
                    value={availableModels.includes(settings.llmModel) ? settings.llmModel : ""}
                    onChange={(e) => updateField("llmModel")(e.target.value)}
                    className="w-full px-3 pr-8 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-200 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all font-mono appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%2371717a%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                  >
                    {!availableModels.includes(settings.llmModel) && (
                      <option value="" disabled>Select a model</option>
                    )}
                    {availableModels.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={settings.llmModel}
                    onChange={(e) => updateField("llmModel")(e.target.value)}
                    placeholder="gpt-4o-mini"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all font-mono"
                  />
                )}
              </div>
            </div>
          </section>

        </div>

        <p className="text-[10px] text-zinc-600 mb-4 px-1">
          Wayback Machine, HN Algolia, ATS verification, layoffs.fyi, and The Muse require no keys. Keys are stored locally via Chrome Sync.
        </p>

        <CustomPageEditor
          pages={settings.customPages}
          onChange={updateCustomPages}
        />
      </div>
    </div>
  );
}
