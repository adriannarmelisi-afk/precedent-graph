import { forwardRef } from "react";
import type { PaletteEntry } from "../../hooks/usePalette";
import type { MaterialEntry } from "../../hooks/useMaterialPalette";
import type { Precedent, Project } from "../../types";
import { MaterialSwatch } from "../materials/MaterialSwatch";

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
  materials: MaterialEntry[];
  influences: Precedent[];
}

export const StyleKitExport = forwardRef<HTMLDivElement, StyleKitExportProps>(
  ({ project, palette, materials, influences }, ref) => {
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
              {palette.map((s, i) => (
                <div
                  key={s.hex + i}
                  style={{ border: `1px solid ${C.hairline}`, borderRadius: 8, overflow: "hidden", background: C.surface }}
                >
                  <div style={{ height: 64, background: s.hex }} />
                  <div style={{ padding: "8px 10px" }}>
                    {s.label && <div style={{ fontSize: 12, fontWeight: 500 }}>{s.label}</div>}
                    <div
                      style={{
                        fontSize: 11,
                        color: s.label ? C.tertiary : C.ink,
                        fontWeight: s.label ? 400 : 500,
                        fontFamily: "monospace",
                        textTransform: "uppercase",
                        marginTop: s.label ? 0 : 2,
                      }}
                    >
                      {s.hex}
                    </div>
                    <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>{s.sourceName}</div>
                    {s.sharedTags.length > 0 && (
                      <div style={{ fontSize: 10, color: C.primary, marginTop: 3 }}>
                        {s.sharedTags.join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Materials — drawn from influence precedents</SectionLabel>
          {materials.length === 0 ? (
            <div style={{ fontSize: 13, color: C.tertiary }}>
              No influences selected yet — mark precedents as influences to build the material set.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {materials.map((m) => (
                <div key={m.tag} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MaterialSwatch tag={m.tag} size={36} imageOverride={m.imageOverride} plain />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, textTransform: "capitalize" }}>
                      {m.tag.replace(/-/g, " ")}
                    </div>
                    <div style={{ fontSize: 11, color: C.subtle }}>{m.sourceName}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionLabel>Source precedents</SectionLabel>
          {influences.length === 0 ? (
            <div style={{ fontSize: 13, color: C.tertiary }}>
              No influences selected yet — mark precedents as influences to list them here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {influences.map((p) => (
                <div key={p.id} style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
                  <span style={{ color: C.ink, fontWeight: 500 }}>{p.name}</span>
                  {p.architect && ` — ${p.architect}`}
                  {p.year ? `, ${p.year}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${C.hairline}`, marginTop: 28, paddingTop: 12, fontSize: 11, color: C.tertiary }}>
          Generated by Concept Constellation · {today}
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

