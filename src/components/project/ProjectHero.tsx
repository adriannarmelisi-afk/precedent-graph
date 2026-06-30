interface ProjectHeroProps {
  projectTitle: string;
  precedentCount: number;
  influenceCount: number;
  onOpenLibrary: () => void;
}

export function ProjectHero({ projectTitle, precedentCount, influenceCount, onOpenLibrary }: ProjectHeroProps) {
  return (
    <div className="gradient-header relative overflow-hidden rounded-2xl border border-hairline px-6 pb-10 pt-5">

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

      <h1
        className="relative mt-8 leading-[0.92] text-ink"
        style={{
          fontSize: "clamp(2.4rem, 7vw, 4.5rem)",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        concept<br />constellation
      </h1>
      <p className="relative mt-3 text-[12px] text-ink-subtle">
        {projectTitle
          ? `Currently mapping — ${projectTitle}`
          : "No project open yet — fill in your concept below."}
      </p>
    </div>
  );
}
