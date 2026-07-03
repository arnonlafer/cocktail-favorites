interface IconProps {
  className?: string
  size?: number
}

function Icon({ className = '', size = 22, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function IconPlus({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function IconHome({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </Icon>
  )
}

export function IconSearch({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Icon>
  )
}

export function IconGrid({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Icon>
  )
}

export function IconList({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" strokeWidth={2.5} />
    </Icon>
  )
}

const HEART_PATH =
  'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'

export function IconHeart({ className, size, filled }: IconProps & { filled?: boolean }) {
  const s = size ?? 22
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={HEART_PATH} />
    </svg>
  )
}

export function IconCollections({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M5 19V6M9 19V9M13 19V4M17 19V11M21 19V7" />
    </Icon>
  )
}

export function IconDraft({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6M8 13h8M8 17h5" />
    </Icon>
  )
}

export function IconCart({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
      <path d="M2 3h2l2.4 12.4a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 8H6" />
    </Icon>
  )
}

export function IconRanOut({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M7 17L17 7" />
    </Icon>
  )
}

export function IconStock({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2z" />
      <path d="M6 9h12v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9z" />
      <path d="M10 13h4" />
    </Icon>
  )
}

export function IconSettings({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  )
}

export function IconClose({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  )
}

export function IconChevronLeft({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M15 6l-6 6 6 6" />
    </Icon>
  )
}

export function IconArrowLeft({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </Icon>
  )
}

export function IconChevronRight({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  )
}

export function IconEdit({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Icon>
  )
}

export function IconTrash({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
      <path d="M10 11v6M14 11v6" />
    </Icon>
  )
}

export function IconLayers({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </Icon>
  )
}

export function IconSortAlpha({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M4 18h6M4 6h10M4 12h8" />
      <path d="M16 6v12M13 9l3-3 3 3" />
    </Icon>
  )
}

export function IconClock({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  )
}

export function IconShuffle({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M16 3h5v5M4 20 21 4M21 16v5h-5M15 15l6 6M4 4l5 5" />
    </Icon>
  )
}

export function IconAi({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M12 3l1.1 3.9L17 8l-3.9 1.1L12 13l-1.1-3.9L7 8l3.9-1.1z" />
      <path d="M19 15l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" />
    </Icon>
  )
}
