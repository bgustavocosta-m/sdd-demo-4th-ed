import type { Player } from '../game/ticTacToe'

/** The fixed avatar grid (#4). Two players may pick the same one. */
export const EMOJIS = ['🦊', '🐸', '🐼', '🐨', '🐯', '🦁', '🐵', '🐧', '🐙', '🦄', '🐢', '🐰'] as const

export const NAME_MAX = 16

export type Profile = Player

const STORAGE_KEY = 'sdd-ttt-profile'

export function randomEmoji(random: () => number = Math.random): string {
  return EMOJIS[Math.floor(random() * EMOJIS.length)]
}

export const isEmoji = (x: string): boolean => (EMOJIS as readonly string[]).includes(x)

/** The trimmed name if it is 1–16 characters long (counted per code point), else `null`. */
export function validateName(raw: string): string | null {
  const name = raw.trim()
  const length = [...name].length
  return length >= 1 && length <= NAME_MAX ? name : null
}

/** The last profile saved, or `null` if there is none, it's invalid, or storage is unavailable. */
export function loadProfile(storage?: Storage): Profile | null {
  try {
    // Reading `localStorage` itself can throw (blocked site data), so the default is resolved in here.
    const raw = (storage ?? globalThis.localStorage).getItem(STORAGE_KEY)
    if (raw === null) return null
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return null
    const { name, emoji } = data as Record<string, unknown>
    if (typeof name !== 'string' || typeof emoji !== 'string' || !isEmoji(emoji)) return null
    const valid = validateName(name)
    return valid === null ? null : { name: valid, emoji }
  } catch {
    return null
  }
}

/** Remembers the profile for next time; silently does nothing if storage is unavailable. */
export function saveProfile(profile: Profile, storage?: Storage): void {
  try {
    (storage ?? globalThis.localStorage).setItem(STORAGE_KEY, JSON.stringify({ name: profile.name, emoji: profile.emoji }))
  } catch {
    // The app works without remembering the profile.
  }
}
