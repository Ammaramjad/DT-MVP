export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div>
        <h1 className="text-[26px] font-black leading-tight">{title}</h1>
        {sub && <p className="text-[13px] text-muted">{sub}</p>}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
