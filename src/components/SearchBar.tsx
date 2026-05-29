interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search cocktails or ingredients…' }: Props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle">🔍</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-app bg-bar-800 py-3 pl-10 pr-4 text-foreground placeholder:text-subtle outline-none focus:border-amber-accent/60"
      />
    </div>
  )
}
