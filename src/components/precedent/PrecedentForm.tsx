import { useState } from "react";
import { useStore } from "../../store/appStore";
import { addPrecedent, updatePrecedent } from "../../store/actions";
import { TagInput } from "../sidebar/TagInput";
import { fetchWikipediaSummary } from "../../utils/wikipediaUtils";
import { extractPalette, extractPaletteFromFile } from "../../utils/colourUtils";
import { normaliseTags } from "../../utils/tagUtils";
import { getMaterialTags } from "../../utils/materialUtils";
import { MaterialSwatch } from "../materials/MaterialSwatch";
import type { Precedent, Swatch } from "../../types";

interface PrecedentFormProps {
  mode: "add" | "edit";
  precedent?: Precedent;
  onClose: () => void;
}

type Status = { kind: "idle" | "loading" | "ok" | "error"; message?: string };

export function PrecedentForm({ mode, precedent, onClose }: PrecedentFormProps) {
  const { dispatch } = useStore();
  const [id] = useState(() => precedent?.id ?? crypto.randomUUID());

  const [name, setName] = useState(precedent?.name ?? "");
  const [architect, setArchitect] = useState(precedent?.architect ?? "");
  const [year, setYear] = useState<string>(precedent?.year ? String(precedent.year) : "");
  const [imageUrl, setImageUrl] = useState(precedent?.imageUrl ?? "");
  const [demonstrates, setDemonstrates] = useState(precedent?.demonstrates ?? "");
  const [tags, setTags] = useState<string[]>(precedent?.tags ?? []);
  const [swatches, setSwatches] = useState<Swatch[]>(precedent?.swatches ?? []);
  const [materialTextures, setMaterialTextures] = useState<Record<string, string>>(
    precedent?.materialTextures ?? {},
  );

  const [lookup, setLookup] = useState<Status>({ kind: "idle" });
  const [extract, setExtract] = useState<Status>({ kind: "idle" });

  const runExtraction = async (url: string) => {
    if (!url) return;
    setExtract({ kind: "loading" });
    try {
      const hexes = await extractPalette(url, 5);
      setSwatches(hexes.map((hex) => ({ hex, label: "", sourceId: id })));
      setExtract({ kind: hexes.length ? "ok" : "error", message: hexes.length ? undefined : "No colours found" });
    } catch {
      setExtract({
        kind: "error",
        message: "Couldn't read colours from that link. Try uploading the image file instead.",
      });
    }
  };

  const runExtractionFromFile = async (file: File) => {
    setExtract({ kind: "loading" });
    try {
      const hexes = await extractPaletteFromFile(file, 5);
      setSwatches(hexes.map((hex) => ({ hex, label: "", sourceId: id })));
      setExtract({ kind: hexes.length ? "ok" : "error", message: hexes.length ? undefined : "No colours found" });
    } catch {
      setExtract({ kind: "error", message: "Couldn't read that file." });
    }
  };

  const runLookup = async () => {
    if (!name.trim()) return;
    setLookup({ kind: "loading" });
    try {
      const result = await fetchWikipediaSummary(name);
      if (!result) {
        setLookup({ kind: "error", message: "No Wikipedia page found — fill the fields manually." });
        return;
      }
      setName(result.title);
      if (result.year && !year) setYear(String(result.year));
      if (result.imageUrl) {
        setImageUrl(result.imageUrl);
        await runExtraction(result.imageUrl);
      }
      setLookup({
        kind: "ok",
        message: result.description || "Found — image and details auto-filled.",
      });
    } catch {
      setLookup({ kind: "error", message: "Lookup failed — check your connection." });
    }
  };

  const setSwatchLabel = (index: number, label: string) =>
    setSwatches((prev) => prev.map((s, i) => (i === index ? { ...s, label } : s)));

  const setMaterialTexture = (tag: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setMaterialTextures((prev) => ({ ...prev, [tag]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeMaterialTexture = (tag: string) =>
    setMaterialTextures((prev) => {
      const next = { ...prev };
      delete next[tag];
      return next;
    });

  const save = () => {
    if (!name.trim()) return;
    const entry: Precedent = {
      id,
      name: name.trim(),
      architect: architect.trim(),
      year: Number(year) || 0,
      demonstrates: demonstrates.trim(),
      tags: normaliseTags(tags),
      swatches: swatches.map((s) => ({ ...s, sourceId: id })),
      isInfluence: precedent?.isInfluence ?? false,
      imageUrl,
      materialTextures,
    };
    dispatch(mode === "add" ? addPrecedent(entry) : updatePrecedent(id, entry));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-hairline bg-surface-1 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">
            {mode === "add" ? "Add precedent" : "Edit precedent"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-subtle transition-colors hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
              Building name
            </label>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runLookup()}
                placeholder="e.g. Therme Vals"
                className="flex-1 rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-tertiary focus:border-primary"
              />
              <button
                type="button"
                onClick={runLookup}
                disabled={lookup.kind === "loading" || !name.trim()}
                className="shrink-0 rounded-md bg-primary px-3 text-[12px] font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-40"
              >
                {lookup.kind === "loading" ? "Looking up…" : "Look up"}
              </button>
            </div>
            {lookup.message && (
              <p
                className={`mt-1 text-[11px] ${lookup.kind === "error" ? "text-primary" : "text-ink-tertiary"}`}
              >
                {lookup.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
                Architect
              </label>
              <input
                value={architect}
                onChange={(e) => setArchitect(e.target.value)}
                placeholder="e.g. Peter Zumthor"
                className="w-full rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-tertiary focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
                Year
              </label>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="e.g. 1996"
                className="w-full rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-tertiary focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
              Image URL
              <span className="ml-1.5 font-normal normal-case">— auto-filled from Wikipedia, or paste your own</span>
            </label>
            <div className="flex gap-2">
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                className="flex-1 rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-[12px] text-ink outline-none placeholder:text-ink-tertiary focus:border-primary"
              />
              <button
                type="button"
                onClick={() => runExtraction(imageUrl)}
                disabled={extract.kind === "loading" || !imageUrl}
                className="shrink-0 rounded-md border border-hairline-strong px-3 text-[12px] text-ink-subtle transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
              >
                {extract.kind === "loading" ? "Extracting…" : "Extract colours"}
              </button>
            </div>
            {extract.message && (
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-[11px] text-primary">{extract.message}</p>
                <label className="shrink-0 cursor-pointer text-[11px] font-medium text-ink-subtle underline hover:text-primary">
                  Upload image instead
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) runExtractionFromFile(file);
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          {imageUrl && (
            <img
              src={imageUrl}
              alt={name}
              className="h-32 w-full rounded-md border border-hairline object-cover"
            />
          )}

          {swatches.length > 0 && (
            <div>
              <label className="mb-2 block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
                Extracted colours — add a material label to each
              </label>
              <div className="flex flex-col gap-2">
                {swatches.map((s, i) => (
                  <div key={s.hex + i} className="flex items-center gap-2.5">
                    <span
                      className="h-8 w-8 shrink-0 rounded border border-hairline"
                      style={{ backgroundColor: s.hex }}
                    />
                    <span className="w-16 shrink-0 font-mono text-[11px] uppercase text-ink-tertiary">
                      {s.hex}
                    </span>
                    <input
                      value={s.label}
                      onChange={(e) => setSwatchLabel(i, e.target.value)}
                      placeholder="e.g. Weathered concrete"
                      className="flex-1 rounded-md border border-hairline bg-surface-1 px-2.5 py-1 text-[12px] text-ink outline-none placeholder:text-ink-tertiary focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
              Demonstrates
              <span className="ml-1.5 font-normal normal-case">— one specific note in your own words</span>
            </label>
            <textarea
              value={demonstrates}
              onChange={(e) => setDemonstrates(e.target.value)}
              rows={2}
              placeholder="e.g. Stone as mass and ritual — compression through dark thresholds into light."
              className="w-full resize-y rounded-md border border-hairline bg-surface-1 px-2.5 py-2 text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-tertiary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
              Tags
            </label>
            <TagInput selected={tags} onChange={setTags} />
          </div>

          {getMaterialTags(tags).length > 0 && (
            <div>
              <label className="mb-2 block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
                Material textures
                <span className="ml-1.5 font-normal normal-case">
                  — auto-generated, or upload a real texture (e.g. from architextures.org)
                </span>
              </label>
              <div className="flex flex-col gap-2">
                {getMaterialTags(tags).map((tag) => (
                  <div key={tag} className="flex items-center gap-2.5">
                    <MaterialSwatch tag={tag} size={32} imageOverride={materialTextures[tag]} />
                    <span className="w-24 shrink-0 text-[12px] text-ink-subtle">{tag}</span>
                    <label className="cursor-pointer text-[11px] font-medium text-ink-subtle underline hover:text-primary">
                      {materialTextures[tag] ? "Replace" : "Upload texture"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setMaterialTexture(tag, file);
                        }}
                      />
                    </label>
                    {materialTextures[tag] && (
                      <button
                        type="button"
                        onClick={() => removeMaterialTexture(tag)}
                        className="text-[11px] text-ink-tertiary underline hover:text-primary"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-hairline pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-hairline-strong px-4 py-1.5 text-[13px] text-ink-subtle transition-colors hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!name.trim()}
            className="rounded-md bg-primary px-4 py-1.5 text-[13px] font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-40"
          >
            {mode === "add" ? "Add precedent" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
