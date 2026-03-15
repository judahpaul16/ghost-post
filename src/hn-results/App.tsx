interface Post {
  id: string;
  headline: string;
  ts: number;
}

function parseHash(): Post[] {
  try {
    const raw = decodeURIComponent(window.location.hash.slice(1));
    return JSON.parse(raw) as Post[];
  } catch {
    return [];
  }
}

function formatDate(ts: number): string {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const company = params.get("company") ?? "Unknown";
  const posts = parseHash();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-orange-500">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1" fill="none"/>
            </svg>
            <h1 className="text-xl font-bold tracking-tight">{company}</h1>
          </div>
          <p className="text-[13px] text-zinc-500 ml-7">
            {posts.length} {posts.length === 1 ? "post" : "posts"} across recent "Who is Hiring?" threads
          </p>
        </div>

        <div className="space-y-3">
          {posts.map((post) => (
            <a
              key={post.id}
              href={`https://news.ycombinator.com/item?id=${post.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block px-5 py-4 rounded-xl bg-zinc-900/70 border border-zinc-800/70 hover:border-orange-900/50 hover:bg-zinc-900 transition-all no-underline"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-[13px] text-zinc-200 leading-relaxed group-hover:text-white transition-colors line-clamp-2">
                  {post.headline || "View hiring post"}
                </p>
                <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-zinc-700 group-hover:text-orange-500 transition-colors" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6.5 3.5H3a1 1 0 00-1 1V13a1 1 0 001 1h8.5a1 1 0 001-1V9.5M9.5 2H14v4.5M14 2L7 9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {post.ts > 0 && (
                <span className="text-[11px] text-zinc-600 mt-1.5 block">
                  {formatDate(post.ts)}
                </span>
              )}
            </a>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-zinc-700">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-orange-800">
            <path d="M0 8V0h8l-4 4 6 6-4 4-6-6 4-4H0z"/>
          </svg>
          <span>Hacker News — Ask HN: Who is Hiring?</span>
        </div>
      </div>
    </div>
  );
}
