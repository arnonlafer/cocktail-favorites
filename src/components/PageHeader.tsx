import { useNavigate } from 'react-router-dom'
import { confirmDiscardChanges } from '../lib/unsavedChanges'
import { IconArrowLeft } from './icons'

const backBtnClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app-strong text-muted transition hover:text-foreground'

interface Props {
  title: string
  backTo?: string
  confirmBack?: boolean
  children?: React.ReactNode
}

export function PageHeader({ title, backTo = '/', confirmBack = false, children }: Props) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (confirmBack && !confirmDiscardChanges()) return
    navigate(backTo)
  }

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-app bg-app px-4 py-4 backdrop-blur">
      <button type="button" onClick={handleBack} aria-label="Back" className={backBtnClass}>
        <IconArrowLeft size={20} />
      </button>
      <h1 className="min-w-0 flex-1 font-display text-xl font-bold text-foreground">{title}</h1>
      {children}
    </div>
  )
}
