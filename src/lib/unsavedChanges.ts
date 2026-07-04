export function confirmDiscardChanges(message = 'You have unsaved changes. Leave without saving?'): boolean {
  return window.confirm(message)
}
