interface ProjectHeroProps {
  projectTitle: string;
  precedentCount: number;
  influenceCount: number;
  onOpenLibrary: () => void;
}

// A large branded banner for the Project tab — same spirit as the gradient
// "hero" headers other students have been adding, but built from the app's
// own cream/red palette instead of a generic dark gradient, so it reads as
// this tool's identity rather than a borrowed template. Shows the app's own
// name, not the project's — the project itself stays a quiet subtitle here.
export function ProjectHero({ projectTitle, precedentCount, influenceCount, onOpenLibrary }: ProjectHeroProps) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-hairline px-6 pb-8 pt-5"
      style={{
        backgroundColor: "#f7f4ef",
        backgroundImage: [
          "radial-gradient(circle at 78% 18%, rgba(192,50,46,0.22), transparent 52%)",
          "radial-gradient(circle at 12% 88%, rgba(192,50,46,0.14), transparent 55%)",
          "radial-gradient(circle at 92% 92%, rgba(193,140,80,0.20), transparent 50%)",
        ].join(", "),
      }}
    >
      <div className="relative flex items-start justify-between gap-6">
        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          Concept Constellation
          <span className="hidden text-ink-tertiary md:inline">· Architecture research</span>
        </div>
        <div className="hidden max-w-xs shrink-0 text-right sm:block">
          <p className="text-[12px] leading-relaxed text-ink-subtle">
            {precedentCount} precedents logged · {influenceCount} marked as influences
          </p>
          <button
            type="button"
            onClick={onOpenLibrary}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-hairline-strong bg-surface-1 px-3 py-1 text-[11px] font-medium text-ink-subtle transition-colors hover:border-primary hover:text-primary"
          >
            Open Library →
          </button>
        </div>
      </div>

      <h1 className="relative mt-10 text-[28px] font-bold uppercase leading-none tracking-tight text-ink sm:text-[44px] md:text-[56px]">
        Concept Constellation
      </h1>
      <p className="relative mt-2 truncate text-[12px] text-ink-subtle">
        {projectTitle ? `Currently mapping — ${projectTitle}` : "No project open yet — fill in your concept below."}
      </p>
    </div>
  );
}
