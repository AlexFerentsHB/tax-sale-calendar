export function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
        <p>
          Tax Sale<span className="text-amber-500">.</span> — tax sale county guide & auction
          calendar.
        </p>
        <p>Data shown is a public, read-only snapshot. Always confirm details with the county.</p>
      </div>
    </footer>
  );
}