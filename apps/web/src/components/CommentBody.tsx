"use client";

/** Minimal markdown for SyncRoom outcome comments — no extra dependency. */
export function CommentBody({ body }: { body: string }) {
  const lines = body.split("\n");

  return (
    <div className="space-y-1 text-sm text-gray-300">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;

        if (trimmed.startsWith("## ")) {
          return (
            <p key={i} className="pt-1 text-xs font-semibold uppercase tracking-wide text-brand-300">
              {trimmed.slice(3)}
            </p>
          );
        }

        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          return (
            <p key={i} className="font-medium text-gray-200">
              {trimmed.slice(2, -2)}
            </p>
          );
        }

        if (trimmed.startsWith("- ")) {
          return (
            <p key={i} className="pl-3 text-gray-300">
              <span className="text-gray-500">•</span> {renderInline(trimmed.slice(2))}
            </p>
          );
        }

        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-medium text-gray-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
