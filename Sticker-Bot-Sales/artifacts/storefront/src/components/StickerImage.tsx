import { useState } from "react";

const PALETTE = [
  ["#FFE066", "#FF6B9D"],
  ["#7CDEC2", "#3D5AFE"],
  ["#FFB17A", "#E63946"],
  ["#C7B8FF", "#FF7BAC"],
  ["#A0E8AF", "#0E7C66"],
  ["#FFD6E0", "#FF477E"],
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function StickerImage({
  src,
  alt,
  className,
  rotate = 0,
}: {
  src?: string;
  alt: string;
  className?: string;
  rotate?: number;
}) {
  const [errored, setErrored] = useState(false);
  const seed = hash(alt || src || "x");
  const [bg, fg] = PALETTE[seed % PALETTE.length]!;
  const initials = alt
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "ST";

  if (src && !errored) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setErrored(true)}
        className={className}
        style={{ transform: `rotate(${rotate}deg)` }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        background: `radial-gradient(circle at 30% 30%, ${bg}, ${bg} 60%, ${fg})`,
        display: "grid",
        placeItems: "center",
        transform: `rotate(${rotate}deg)`,
        boxShadow: "inset 0 0 0 4px white, 0 8px 24px rgba(0,0,0,.10)",
        borderRadius: "9999px",
      }}
    >
      <span
        style={{
          color: "#0e1626",
          fontFamily: "Fraunces, serif",
          fontWeight: 700,
          fontSize: "min(38%, 64px)",
          letterSpacing: "-0.04em",
        }}
      >
        {initials}
      </span>
    </div>
  );
}
