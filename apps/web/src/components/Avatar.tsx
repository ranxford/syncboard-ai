"use client";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  color,
  size = 32,
  ring = false,
}: {
  name: string;
  color: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <div
      title={name}
      className={`flex items-center justify-center rounded-full font-semibold text-white shrink-0 ${
        ring ? "ring-2 ring-offset-2 ring-offset-ink-900" : ""
      }`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.4,
        // @ts-expect-error css var for ring color
        "--tw-ring-color": color,
      }}
    >
      {initials(name)}
    </div>
  );
}
