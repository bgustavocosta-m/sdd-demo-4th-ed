import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMOJIS, loadProfile, randomEmoji, saveProfile, validateName } from './profile'

/** An in-memory `Storage` stand-in (Vitest runs in `node`, without `localStorage`). */
function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  }
}

/** Storage that throws on every access, like Safari private mode or blocked site data. */
const throwingStorage = new Proxy({} as Storage, {
  get() {
    throw new DOMException('denied', 'SecurityError')
  },
})

afterEach(() => vi.unstubAllGlobals())

describe('EMOJIS', () => {
  it('is the fixed grid of 12 animals', () => {
    expect(EMOJIS).toEqual(['🦊', '🐸', '🐼', '🐨', '🐯', '🦁', '🐵', '🐧', '🐙', '🦄', '🐢', '🐰'])
  })
})

describe('randomEmoji', () => {
  it.each([
    [0, '🦊'],
    [0.5, '🐵'],
    [0.9999, '🐰'],
  ])('maps random %f to %s', (r, emoji) => {
    expect(randomEmoji(() => r)).toBe(emoji)
  })

  it('always picks one of the 12', () => {
    for (let i = 0; i < 200; i++) expect(EMOJIS).toContain(randomEmoji())
  })
})

describe('validateName', () => {
  it.each([
    ['Ana', 'Ana'],
    ['  Rui  ', 'Rui'],
    ['A', 'A'],
    ['x'.repeat(16), 'x'.repeat(16)],
    [`  ${'x'.repeat(16)}  `, 'x'.repeat(16)],
    ['Ana Maria', 'Ana Maria'],
    ['😀'.repeat(16), '😀'.repeat(16)], // counted per character, not per UTF-16 unit
  ])('accepts %j as %j', (raw, name) => {
    expect(validateName(raw)).toBe(name)
  })

  it.each(['', '   ', '\t\n', 'x'.repeat(17), '😀'.repeat(17)])('rejects %j', (raw) => {
    expect(validateName(raw)).toBeNull()
  })
})

describe('loadProfile / saveProfile', () => {
  it('round-trips a profile', () => {
    const storage = memoryStorage()
    saveProfile({ name: 'Ana', emoji: '🦊' }, storage)
    expect(loadProfile(storage)).toEqual({ name: 'Ana', emoji: '🦊' })
  })

  it('keeps only the last profile saved', () => {
    const storage = memoryStorage()
    saveProfile({ name: 'Ana', emoji: '🦊' }, storage)
    saveProfile({ name: 'Rui', emoji: '🐸' }, storage)
    expect(loadProfile(storage)).toEqual({ name: 'Rui', emoji: '🐸' })
  })

  it('returns null when nothing was saved', () => {
    expect(loadProfile(memoryStorage())).toBeNull()
  })

  it.each([
    'not json',
    'null',
    '42',
    '{}',
    '{"name":"","emoji":"🦊"}',
    `{"name":"${'x'.repeat(17)}","emoji":"🦊"}`,
    '{"name":"Ana","emoji":"🍕"}',
    '{"name":"Ana"}',
  ])('returns null for a stored %s', (raw) => {
    const storage = memoryStorage()
    storage.setItem('sdd-ttt-profile', raw)
    expect(loadProfile(storage)).toBeNull()
  })

  it('survives a throwing storage', () => {
    expect(() => saveProfile({ name: 'Ana', emoji: '🦊' }, throwingStorage)).not.toThrow()
    expect(loadProfile(throwingStorage)).toBeNull()
  })

  it('uses window.localStorage by default', () => {
    const storage = memoryStorage()
    vi.stubGlobal('localStorage', storage)
    saveProfile({ name: 'Ana', emoji: '🦊' })
    expect(loadProfile()).toEqual({ name: 'Ana', emoji: '🦊' })
  })

  it('survives a localStorage getter that throws', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError')
      },
    })
    try {
      expect(() => saveProfile({ name: 'Ana', emoji: '🦊' })).not.toThrow()
      expect(loadProfile()).toBeNull()
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage
    }
  })
})
