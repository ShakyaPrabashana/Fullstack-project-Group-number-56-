import { useEffect, useState } from 'react'
import { KEYS, read, remove, write } from '../lib/storage'

/**
 * The in-progress booking, mirrored to localStorage on every keystroke.
 *
 * This is the client-side persistence the brief asks for (M3): close the tab
 * mid-booking, lose the network, or refresh, and the half-filled draft is still
 * there when you come back.
 */
export function useDraft() {
  const [draft, setDraft] = useState(() => read(KEYS.draft, null))

  useEffect(() => {
    if (draft) write(KEYS.draft, draft)
    else remove(KEYS.draft)
  }, [draft])

  return [draft, setDraft]
}

export function hadSavedDraft() {
  return read(KEYS.draft, null) !== null
}
