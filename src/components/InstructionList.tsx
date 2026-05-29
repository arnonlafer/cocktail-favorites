interface Props {
  steps: string[]
}

export function InstructionList({ steps }: Props) {
  return (
    <ol className="divide-app divide-y rounded-2xl border border-app bg-bar-900/60">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3 px-4 py-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-accent/20 text-xs font-bold text-amber-light">
            {i + 1}
          </span>
          <span className="flex-1 text-sm leading-relaxed text-foreground/90">{step}</span>
        </li>
      ))}
    </ol>
  )
}
