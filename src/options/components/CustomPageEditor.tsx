import { useState } from "react";
import type { CustomPageConfig } from "@/types";

const EMPTY_PAGE: Omit<CustomPageConfig, "id"> = {
  name: "",
  urlPattern: "",
  selectors: {
    company: "",
    title: "",
  },
};

function SelectorField({
  label,
  value,
  onChange,
  placeholder,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium text-zinc-400">
        {label}
        {optional && <span className="text-zinc-600 ml-1">optional</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all font-mono"
      />
    </div>
  );
}

function PageForm({
  page,
  onSave,
  onCancel,
}: {
  page: Omit<CustomPageConfig, "id">;
  onSave: (page: Omit<CustomPageConfig, "id">) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(page);
  const [showAdvanced, setShowAdvanced] = useState(
    !!(page.selectors.jobCard || page.selectors.postingContainer)
  );

  const updateSelector = (key: keyof CustomPageConfig["selectors"]) => (value: string) => {
    setDraft((prev) => ({
      ...prev,
      selectors: { ...prev.selectors, [key]: value || undefined },
    }));
  };

  const valid = draft.name.trim() && draft.urlPattern.trim() && draft.selectors.company.trim() && draft.selectors.title.trim();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <SelectorField
          label="Name"
          value={draft.name}
          onChange={(v) => setDraft((p) => ({ ...p, name: v }))}
          placeholder="My Company Careers"
        />
        <SelectorField
          label="URL Pattern"
          value={draft.urlPattern}
          onChange={(v) => setDraft((p) => ({ ...p, urlPattern: v }))}
          placeholder="careers.example.com/*"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SelectorField
          label="Company Selector"
          value={draft.selectors.company}
          onChange={updateSelector("company")}
          placeholder=".company-name"
        />
        <SelectorField
          label="Title Selector"
          value={draft.selectors.title}
          onChange={updateSelector("title")}
          placeholder="h1.job-title"
        />
      </div>

      <SelectorField
        label="Date Selector"
        value={draft.selectors.datePosted ?? ""}
        onChange={updateSelector("datePosted")}
        placeholder="time.posted-date"
        optional
      />

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {showAdvanced ? "Hide" : "Show"} job list selectors
      </button>

      {showAdvanced && (
        <div className="space-y-3 pl-3 border-l-2 border-zinc-800">
          <p className="text-[10px] text-zinc-600 leading-relaxed">
            For pages with lists of job postings (search results, job boards).
          </p>
          <SelectorField
            label="Job Card Selector"
            value={draft.selectors.jobCard ?? ""}
            onChange={updateSelector("jobCard")}
            placeholder=".job-card, li.job-result"
            optional
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectorField
              label="Card Company Selector"
              value={draft.selectors.cardCompany ?? ""}
              onChange={updateSelector("cardCompany")}
              placeholder=".company"
              optional
            />
            <SelectorField
              label="Card URL Selector"
              value={draft.selectors.cardUrl ?? ""}
              onChange={updateSelector("cardUrl")}
              placeholder="a.job-link"
              optional
            />
          </div>
          <SelectorField
            label="Card Date Selector"
            value={draft.selectors.cardDate ?? ""}
            onChange={updateSelector("cardDate")}
            placeholder="time, .date"
            optional
          />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => valid && onSave(draft)}
          disabled={!valid}
          className="px-4 py-2 rounded-lg text-[12px] font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-[12px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function CustomPageEditor({
  pages,
  onChange,
}: {
  pages: CustomPageConfig[];
  onChange: (pages: CustomPageConfig[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const requestHostPermission = async (urlPattern: string): Promise<boolean> => {
    const host = urlPattern.split("/")[0].replace(/\*/g, "*");
    const origin = `https://${host}/*`;
    try {
      return await chrome.permissions.request({ origins: [origin] });
    } catch {
      return false;
    }
  };

  const addPage = async (draft: Omit<CustomPageConfig, "id">) => {
    const granted = await requestHostPermission(draft.urlPattern);
    if (!granted) return;
    const id = crypto.randomUUID();
    onChange([...pages, { ...draft, id }]);
    setAdding(false);
  };

  const updatePage = async (id: string, draft: Omit<CustomPageConfig, "id">) => {
    const granted = await requestHostPermission(draft.urlPattern);
    if (!granted) return;
    onChange(pages.map((p) => (p.id === id ? { ...draft, id } : p)));
    setEditingId(null);
  };

  const removePage = (id: string) => {
    onChange(pages.filter((p) => p.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <section className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/60">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <h2 className="text-[13px] font-semibold text-zinc-300">Custom Pages</h2>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setEditingId(null); }}
            className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors font-medium"
          >
            + Add
          </button>
        )}
      </div>

      <p className="text-[11px] text-zinc-500 leading-relaxed mb-4">
        Add CSS selectors for job boards not supported by default. Use * as wildcard in URL patterns.
      </p>

      {pages.length > 0 && (
        <div className="space-y-2 mb-4">
          {pages.map((page) =>
            editingId === page.id ? (
              <div key={page.id} className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <PageForm
                  page={page}
                  onSave={(draft) => updatePage(page.id, draft)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div
                key={page.id}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/40 group"
              >
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-zinc-200 truncate">{page.name}</div>
                  <div className="text-[11px] text-zinc-600 font-mono truncate">{page.urlPattern}</div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => { setEditingId(page.id); setAdding(false); }}
                    className="px-2.5 py-1 rounded-md text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removePage(page.id)}
                    className="px-2.5 py-1 rounded-md text-[11px] text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {adding && (
        <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <PageForm
            page={EMPTY_PAGE}
            onSave={addPage}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}
    </section>
  );
}
