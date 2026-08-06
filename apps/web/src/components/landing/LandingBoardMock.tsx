/** Board preview — matches in-app kanban styling. */
export function LandingBoardMock() {
  const columns = [
    {
      name: "To Do",
      color: "#6b7280",
      count: 2,
      cards: [
        { title: "Partner onboarding checklist", labels: ["ops"] },
        { title: "Site survey week 2", labels: ["field"] },
      ],
    },
    {
      name: "In Progress",
      color: "#d4a84b",
      count: 1,
      cards: [{ title: "WebSocket presence", labels: ["backend"] }],
    },
    {
      name: "Review",
      color: "#2a9d8f",
      count: 1,
      cards: [{ title: "Accessibility audit", labels: ["design"] }],
    },
    {
      name: "Done",
      color: "#4ade80",
      count: 1,
      cards: [{ title: "Auth + invites", labels: ["shipped"] }],
    },
  ];

  return (
    <div className="card card-shadow overflow-hidden">
      <div className="board-toolbar !px-4 !py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-100">SyncBoard Launch</span>
          <span className="pill">Community</span>
        </div>
        <span className="text-xs text-gray-500">3 online</span>
      </div>
      <div className="board-canvas flex gap-2 overflow-x-auto p-3">
        {columns.map((col) => (
          <div key={col.name} className="board-column !w-[148px] sm:!w-[160px]">
            <div className="board-column-header !px-2 !py-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-[11px] font-semibold text-gray-300">{col.name}</span>
                <span className="pill text-[10px]">{col.count}</span>
              </div>
            </div>
            <div className="space-y-2 p-2">
              {col.cards.map((card) => (
                <div key={card.title} className="task-card !p-2">
                  <p className="text-[11px] font-medium leading-snug text-gray-200">{card.title}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {card.labels.map((l) => (
                      <span key={l} className="pill text-[9px]">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
