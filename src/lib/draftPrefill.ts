const INGREDIENT_HINT = /\d|oz|ml|dash|tsp|tbsp|part|cup|slice/i

export interface DraftPrefill {
  name: string
  ingredientsText: string
  instructionsText: string
}

/** Map selected draft text into add-recipe form fields. */
export function parseDraftSelection(text: string): DraftPrefill {
  const trimmed = text.trim()
  if (!trimmed) {
    return { name: '', ingredientsText: '', instructionsText: '' }
  }

  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 1) {
    if (INGREDIENT_HINT.test(lines[0]!)) {
      return { name: '', ingredientsText: lines[0]!, instructionsText: '' }
    }
    return { name: lines[0]!, ingredientsText: '', instructionsText: '' }
  }

  const first = lines[0]!
  if (!INGREDIENT_HINT.test(first) && first.length < 80) {
    const rest = lines.slice(1)
    const instructionStart = rest.findIndex((l) => /^(shake|stir|strain|pour|build|muddle|blend|combine|add|rim|garnish)/i.test(l))
    if (instructionStart >= 0) {
      return {
        name: first,
        ingredientsText: rest.slice(0, instructionStart).join('\n'),
        instructionsText: rest.slice(instructionStart).join('\n'),
      }
    }
    return {
      name: first,
      ingredientsText: rest.join('\n'),
      instructionsText: '',
    }
  }

  return { name: '', ingredientsText: trimmed, instructionsText: '' }
}
