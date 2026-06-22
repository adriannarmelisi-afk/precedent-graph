// Procedural, offline material-texture tiles — one pattern per Material vocabulary
// tag. Pure SVG, no images/network, so they render identically everywhere
// (cards, sidebar, html2canvas export) with zero CORS or loading concerns.
import { useId } from "react";

interface MaterialSwatchProps {
  tag: string;
  size?: number;
  imageOverride?: string;
  // Skip Tailwind/CSS-variable classes and use inline hex instead — required
  // inside the html2canvas export sheet, which must stay 100% inline-styled.
  plain?: boolean;
}

function PatternDefs({ tag, patternId }: { tag: string; patternId: string }) {
  switch (tag) {
    case "concrete":
      return (
        <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#b7b6ae" />
          {[
            [1, 2], [4, 1], [7, 3], [2, 6], [6, 7], [8, 8], [3, 9],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="0.5" fill="#8f8e85" opacity="0.6" />
          ))}
        </pattern>
      );
    case "timber":
      return (
        <pattern id={patternId} width="20" height="8" patternUnits="userSpaceOnUse">
          <rect width="20" height="8" fill="#a9805a" />
          <path d="M0,1 Q5,0 10,1.5 T20,1" stroke="#8a6440" strokeWidth="0.6" fill="none" opacity="0.7" />
          <path d="M0,4 Q5,3 10,4.5 T20,4" stroke="#8a6440" strokeWidth="0.6" fill="none" opacity="0.5" />
          <path d="M0,6.5 Q5,6 10,7 T20,6.5" stroke="#8a6440" strokeWidth="0.5" fill="none" opacity="0.6" />
        </pattern>
      );
    case "steel":
      return (
        <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#a4aab0" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#888f96" strokeWidth="1" opacity="0.5" />
        </pattern>
      );
    case "brick":
      return (
        <pattern id={patternId} width="16" height="8" patternUnits="userSpaceOnUse">
          <rect width="16" height="8" fill="#a85a3f" />
          <rect x="0" y="0" width="7.5" height="3.5" fill="#974f36" stroke="#7a3f2c" strokeWidth="0.4" />
          <rect x="8" y="0" width="7.5" height="3.5" fill="#a85a3f" stroke="#7a3f2c" strokeWidth="0.4" />
          <rect x="-4" y="4" width="7.5" height="3.5" fill="#a85a3f" stroke="#7a3f2c" strokeWidth="0.4" />
          <rect x="4" y="4" width="7.5" height="3.5" fill="#974f36" stroke="#7a3f2c" strokeWidth="0.4" />
          <rect x="12" y="4" width="7.5" height="3.5" fill="#a85a3f" stroke="#7a3f2c" strokeWidth="0.4" />
        </pattern>
      );
    case "glass":
      return (
        <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <rect width="10" height="10" fill="#cfe8ec" />
          <line x1="0" y1="0" x2="0" y2="10" stroke="#a9cdd2" strokeWidth="1.5" opacity="0.5" />
          <line x1="5" y1="0" x2="5" y2="10" stroke="#ffffff" strokeWidth="0.6" opacity="0.6" />
        </pattern>
      );
    case "stone":
      return (
        <pattern id={patternId} width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#b8ad9c" />
          <path d="M0,5 Q4,2 7,5 T14,4" stroke="#998e7c" strokeWidth="0.6" fill="none" opacity="0.6" />
          <path d="M2,11 Q6,9 9,12 T14,10" stroke="#998e7c" strokeWidth="0.6" fill="none" opacity="0.5" />
          <circle cx="3" cy="3" r="1" fill="#a39880" opacity="0.5" />
          <circle cx="10" cy="9" r="1.2" fill="#a39880" opacity="0.5" />
        </pattern>
      );
    case "rammed-earth":
      return (
        <pattern id={patternId} width="20" height="6" patternUnits="userSpaceOnUse">
          <rect width="20" height="6" fill="#b08d5a" />
          <rect y="0" width="20" height="1.2" fill="#a07d4c" opacity="0.7" />
          <rect y="2.4" width="20" height="1" fill="#c39a64" opacity="0.6" />
          <rect y="4.4" width="20" height="1.2" fill="#9a7546" opacity="0.7" />
        </pattern>
      );
    case "ceramic":
      return (
        <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#e8e2d5" />
          <rect width="9.5" height="9.5" fill="none" stroke="#cfc7b4" strokeWidth="0.5" />
        </pattern>
      );
    case "copper":
      return (
        <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
          <rect width="8" height="8" fill="#b5672f" />
          <line x1="0" y1="0" x2="8" y2="0" stroke="#9a5424" strokeWidth="1" opacity="0.5" />
          <line x1="0" y1="4" x2="8" y2="4" stroke="#cf7d42" strokeWidth="0.6" opacity="0.5" />
        </pattern>
      );
    case "textile":
      return (
        <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#c9c2b3" />
          <line x1="0" y1="0" x2="6" y2="0" stroke="#aba384" strokeWidth="1" />
          <line x1="0" y1="3" x2="6" y2="3" stroke="#aba384" strokeWidth="1" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#aba384" strokeWidth="1" />
          <line x1="3" y1="0" x2="3" y2="6" stroke="#aba384" strokeWidth="1" />
        </pattern>
      );
    default:
      return (
        <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#d3d1c7" />
        </pattern>
      );
  }
}

export function MaterialSwatch({ tag, size = 40, imageOverride, plain = false }: MaterialSwatchProps) {
  const uid = useId();
  const patternId = `mat-${tag}-${uid}`;
  const plainStyle = plain ? { borderRadius: 4, border: "1px solid #e4e3df" } : undefined;

  if (imageOverride) {
    return (
      <img
        src={imageOverride}
        alt={tag}
        title={tag}
        width={size}
        height={size}
        className={plain ? "object-cover" : "rounded border border-hairline object-cover"}
        style={{ width: size, height: size, ...plainStyle }}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={plain ? undefined : "rounded border border-hairline"}
      style={plainStyle}
      role="img"
      aria-label={tag}
    >
      <defs>
        <PatternDefs tag={tag} patternId={patternId} />
      </defs>
      <rect width={size} height={size} fill={`url(#${patternId})`} />
    </svg>
  );
}
