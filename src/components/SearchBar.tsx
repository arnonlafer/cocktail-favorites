interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search cocktails or ingredients…' }: Props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-bar-800 py-3 pl-10 pr-4 text-white placeholder:text-white/35 outline-none focus:border-amber-accent/60"
      />
    </div>
  )
}
