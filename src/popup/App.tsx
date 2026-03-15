import { useState, useEffect } from "react";
import type { GhostScore } from "@/types";
import { ScoreCard } from "./components/ScoreCard";
import { SignalList } from "./components/SignalList";
import { Loading } from "./components/Loading";

const GHOST_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2C7.6 2 4 5.6 4 10v10.5c0 .6.4.8.9.5l2.1-2.1 2.1 2.1c.3.3.9.3 1.2 0L12 19.4l1.7 1.6c.3.3.9.3 1.2 0l2.1-2.1 2.1 2.1c.5.3.9.1.9-.5V10c0-4.4-3.6-8-8-8zM9 12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
  </svg>
);

export default function App() {
  const [score, setScore] = useState<GhostScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabId, setTabId] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string | undefined>();

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        setError("No active tab");
        setLoading(false);
        return;
      }

      setTabId(tab.id!);

      let attempts = 0;
      const maxAttempts = 15;
      let cancelled = false;

      function fetchScore() {
        if (cancelled) return;
        chrome.runtime.sendMessage(
          { type: "GET_TAB_SCORE", tabId: tab.id },
          (response: { type: string; score?: GhostScore; progress?: string[] }) => {
            if (cancelled || chrome.runtime.lastError) return;
            if (response?.type === "score" && response.score) {
              setScore(response.score);
              setLoading(false);
            } else if (response?.type === "noPosting" || response?.type === "pending") {
              if (response.progress?.length) {
                setLoadingStep(response.progress[response.progress.length - 1]);
              }
              attempts++;
              if (attempts >= maxAttempts) {
                setError("Couldn't extract job data from this page");
                setLoading(false);
              } else {
                setTimeout(fetchScore, 1000);
              }
            }
          }
        );
      }

      fetchScore();

      return () => { cancelled = true; };
    });
  }, []);

  return (
    <div className="p-5">
      <header className="flex items-center gap-2.5 mb-5">
        <div className="text-purple-400">{GHOST_SVG}</div>
        <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
          Ghost Post
        </span>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="ml-auto w-5 h-5 rounded-full border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors flex items-center justify-center text-[11px] font-semibold"
          aria-label="Scoring info"
        >
          ?
        </button>
      </header>

      {showInfo && (
        <div className="mb-4 rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3.5 text-[11px] leading-relaxed text-zinc-400">
          <p className="text-zinc-300 font-medium mb-2">How scoring works</p>
          <p className="mb-2">
            Lower scores are better. Each signal adds points based on how suspicious it is.
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span><span className="text-emerald-400 font-medium">0 – 25</span> Likely Real</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <span><span className="text-amber-400 font-medium">26 – 50</span> Caution</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
              <span><span className="text-red-400 font-medium">51 – 100</span> Likely Ghost</span>
            </div>
          </div>
        </div>
      )}

      {loading && <Loading step={loadingStep} />}

      {error && !score && (
        <div className="flex flex-col items-center py-10 gap-3">
          <div className="text-zinc-600">{GHOST_SVG}</div>
          <p className="text-[13px] text-zinc-500 text-center leading-relaxed max-w-[240px]">
            {error}
          </p>
        </div>
      )}

      {score && (
        <>
          <ScoreCard score={score} />
          <SignalList signals={score.signals} />
          <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between">
            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z" />
                <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 002.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 001.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 00-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 00-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 00-2.692-1.115l-.292.16c-.764.415-1.6-.421-1.184-1.185l.159-.291A1.873 1.873 0 001.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 003.06 4.377l-.16-.292c-.415-.764.421-1.6 1.185-1.184l.292.159a1.873 1.873 0 002.692-1.115l.094-.319z" />
              </svg>
              Settings
            </button>
            <button
              onClick={() => {
                if (!tabId || refetching) return;
                setRefetching(true);
                chrome.runtime.sendMessage(
                  { type: "REFETCH_SCORE", tabId },
                  (response) => {
                    if (response) {
                      setScore(response as GhostScore);
                    }
                    setRefetching(false);
                  }
                );
              }}
              disabled={refetching}
              className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className={`w-3 h-3 ${refetching ? "animate-spin" : ""}`}>
                <path d="M13.65 2.35a8 8 0 10.59 10.54.75.75 0 00-1.3-.74A6.5 6.5 0 1113.06 4H10.75a.75.75 0 000 1.5h3.5a.75.75 0 00.75-.75v-3.5a.75.75 0 00-1.35-.45z" />
              </svg>
              {refetching ? "Refetching..." : "Refetch"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
