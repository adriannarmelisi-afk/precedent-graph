import { useStore } from "../../store/appStore";
import { resetAll, resetProject } from "../../store/actions";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { dispatch } = useStore();

  const handleResetProject = () => {
    if (confirm("Clear your project title, summary, tags, and influence marks? Precedents stay untouched.")) {
      dispatch(resetProject());
    }
  };

  const handleResetAll = () => {
    if (confirm("Reset everything — project AND precedent library back to the starting set? This can't be undone.")) {
      dispatch(resetAll());
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-hairline bg-surface-1 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-subtle transition-colors hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <section className="mb-6">
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
            About this tool
          </h3>
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Precedent research usually stays a disconnected scrapbook of saved images. This tool
            links it to your concept tags, colour palette, and materials, so the research actually
            feeds your design language instead of sitting beside it.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
            <strong className="text-ink">Analyse runs entirely offline by default</strong> — colour
            and tag matching happen in your browser, nothing is sent anywhere. An optional
            Claude-powered comparison is available only if you supply your own API key.
          </p>
        </section>

        <section className="mb-6 border-t border-hairline pt-5">
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
            Data
          </h3>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleResetProject}
              className="rounded-md border border-hairline-strong px-3 py-2 text-left text-[13px] text-ink-subtle transition-colors hover:border-primary hover:text-primary"
            >
              Reset project
              <span className="block text-[11px] text-ink-tertiary">
                Clears title, summary, tags &amp; influence marks. Keeps your precedent library.
              </span>
            </button>
            <button
              type="button"
              onClick={handleResetAll}
              className="rounded-md border border-hairline-strong px-3 py-2 text-left text-[13px] text-ink-subtle transition-colors hover:border-primary hover:text-primary"
            >
              Reset everything
              <span className="block text-[11px] text-ink-tertiary">
                Project AND precedent library back to the starting set.
              </span>
            </button>
          </div>
        </section>

        <section className="border-t border-hairline pt-5">
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
            Tips
          </h3>
          <ul className="flex flex-col gap-2 text-[13px] leading-relaxed text-ink-muted">
            <li>
              "Look up" searches Wikipedia — free, no account needed. Not listed there? Paste an
              image URL directly instead.
            </li>
            <li>
              If a pasted image URL won't load (some sites block this), try "Upload image instead"
              — it always works.
            </li>
            <li>
              The "☀ Climate" button on Project looks up real climate data for your site —
              free, no account, no key (Open-Meteo + OpenStreetMap). It nudges tag suggestions
              and Analyse, never decides anything for you.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
