import { forwardRef } from "react";
import type { PaletteEntry } from "../../hooks/usePalette";
import type { Project } from "../../types";

// Off-screen "style kit" sheet captured to PNG by html2canvas.
// Everything is inline-styled with explicit hex (no CSS variables / Tailwind
// utilities) so html2canvas never hits an unsupported colour function.
const C = {
  canvas: "#f4f3f0",
  surface: "#ffffff",
  ink: "#1a1a1a",
  muted: "#4a4a47",
  subtle: "#6b6b6b",
  tertiary: "#9a9a96",
  hairline: "#e4e3df",
  hairlineStrong: "#d3d1c7",
  primary: "#c0322e",
  primarySoft: "#fcecec",
};

const FONT = '"Inter", -apple-system, system-ui, "Segoe UI", Roboto, sans-serif';

interface StyleKitExportProps {
  project: Project;
  palette: PaletteEntry[];
}

export const StyleKitExport = forwardRef<HTMLDivElement, StyleKitExportProps>(
  ({ project, palette }, ref) => {
    const today = new Date().toISOString().slice(0, 10);

    return (
      <div
        ref={ref}
        style={{
          width: 760,
          padding: 48,
          background: C.canvas,
          color: C.ink,
          fontFamily: FONT,
          boxSizing: "border-box",
        }}
      >
        <div style={{ borderBottom: `2px solid ${C.primary}`, paddingBottom: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.primary, fontWeight: 600 }}>
            Style kit
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5, marginTop: 4 }}>
            {project.title || "Untitled project"}
          </div>
          {project.summary && (
            <div style={{ fontSize: 13, lineHeight: 1.6, color: C.muted, marginTop: 8, maxWidth: 560 }}>
              {project.summary}
            </div>
          )}
        </div>

        {project.tags.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>Concept</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {project.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: C.primary,
                    background: C.primarySoft,
                    borderRadius: 9999,
                    padding: "3px 12px",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Palette — every colour traced to its source</SectionLabel>
          {palette.length === 0 ? (
            <div style={{ fontSize: 13, color: C.tertiary }}>
              No influences selected yet — mark precedents as influences to build the palette.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {palette.map((s) => (
                <div
                  key={s.hex}
                  style={{ border: `1px solid ${C.hairline}`, borderRadius: 8, overflow: "hidden", background: C.surface }}
                >
                  <div style={{ height: 64, background: s.hex }} />
                  <div style={{ padding: "8px 10px" }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{s.label || "Unlabelled"}</div>
                    <div style={{ fontSize: 11, color: C.tertiary, fontFamily: "monospace", textTransform: "uppercase" }}>
                      {s.hex}
                    </div>
                    <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>{s.sourceName}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <SectionLabel>Graphic key</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <KeyRow>
                <Dot fill={C.hairlineStrong} stroke={C.tertiary} />
                <span>Precedent</span>
              </KeyRow>
              <KeyRow>
                <Dot fill={C.primary} stroke={C.primary} />
                <span>Influence</span>
              </KeyRow>
              <KeyRow>
                <Diamond />
                <span>Your project</span>
              </KeyRow>
              <KeyRow>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, width: 28 }}>
                  <span style={{ width: 24, height: 1, background: C.hairlineStrong }} />
                </span>
                <span>1 shared tag</span>
              </KeyRow>
              <KeyRow>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, width: 28 }}>
                  <span style={{ width: 24, height: 4, background: C.tertiary }} />
                </span>
                <span>3+ shared tags</span>
              </KeyRow>
            </div>
          </div>

          <div>
            <SectionLabel>Typeface — Inter</SectionLabel>
            <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1.1 }}>
              Aa Bb Cc
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
              Headings 600 · Body 400. Sentence case, tight tracking on display.
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.hairline}`, marginTop: 28, paddingTop: 12, fontSize: 11, color: C.tertiary }}>
          Generated by Precedent Graph · {today}
        </div>
      </div>
    );
  },
);

StyleKitExport.displayName = "StyleKitExport";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: C.tertiary, fontWeight: 600, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function KeyRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.muted }}>{children}</div>;
}

function Dot({ fill, stroke }: { fill: string; stroke: string }) {
  return <span style={{ width: 16, height: 16, borderRadius: "50%", background: fill, border: `2px solid ${stroke}`, boxSizing: "border-box", display: "inline-block" }} />;
}

function Diamond() {
  return <span style={{ width: 14, height: 14, background: C.primary, transform: "rotate(45deg)", display: "inline-block", margin: 1 }} />;
}
