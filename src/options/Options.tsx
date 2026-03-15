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

export default function Options() {
  const [settings, setSettings] = useState<Settings>({
    pdlApiKey: "",
    airtableApiKey: "",
    airtableBaseId: "",
    jsearchApiKey: "",
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

  const updateField = (field: "pdlApiKey" | "airtableApiKey" | "airtableBaseId" | "jsearchApiKey") => (value: string) => {
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
            <p className="text-[10px] text-zinc-600 mb-3">Company headcount and funding data. Free: 100/month.</p>
            <ApiKeyField
              label="API Key"
              value={settings.pdlApiKey}
              onChange={updateField("pdlApiKey")}
              placeholder="pdl_live_..."
            />
          </section>

          <section className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <h2 className="text-[12px] font-semibold text-zinc-300">Airtable (layoffs.fyi)</h2>
            </div>
            <p className="text-[10px] text-zinc-600 mb-3">Check for recent company layoffs. Free: 1,000/month.</p>
            <div className="space-y-3">
              <ApiKeyField
                label="API Key"
                value={settings.airtableApiKey}
                onChange={updateField("airtableApiKey")}
                placeholder="pat..."
              />
              <ApiKeyField
                label="Base ID"
                value={settings.airtableBaseId}
                onChange={updateField("airtableBaseId")}
                placeholder="app..."
              />
            </div>
          </section>

          <section className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <h2 className="text-[12px] font-semibold text-zinc-300">JSearch (RapidAPI)</h2>
            </div>
            <p className="text-[10px] text-zinc-600 mb-3">Cross-reference listings across job platforms. Free: 500/month.</p>
            <ApiKeyField
              label="API Key"
              value={settings.jsearchApiKey}
              onChange={updateField("jsearchApiKey")}
              placeholder="rapid_api_..."
            />
          </section>
        </div>

        <p className="text-[10px] text-zinc-600 mb-4 px-1">
          Wayback Machine, HN Algolia, and ATS verification require no keys. Keys are stored locally via Chrome Sync.
        </p>

        <CustomPageEditor
          pages={settings.customPages}
          onChange={updateCustomPages}
        />
      </div>
    </div>
  );
}
