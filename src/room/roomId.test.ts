import { describe, expect, it } from 'vitest'
import { generateRoomId, isValidRoomId, toPeerId } from './roomId'

describe('generateRoomId', () => {
  it('always yields 6 chars of [a-z0-9]', () => {
    for (let i = 0; i < 5000; i++) {
      expect(generateRoomId()).toMatch(/^[a-z0-9]{6}$/)
    }
  })

  it('uses the whole alphabet and rarely repeats', () => {
    const ids = Array.from({ length: 5000 }, generateRoomId)
    expect(new Set(ids).size).toBeGreaterThan(4990)
    const chars = new Set(ids.join(''))
    expect(chars.size).toBe(36)
  })
})

describe('isValidRoomId', () => {
  it.each(['k3x9p2', 'abcdef', '000000', 'zzzzzz', 'a1b2c3'])('accepts %j', (id) => {
    expect(isValidRoomId(id)).toBe(true)
  })

  it.each(['', 'k3x9p', 'k3x9p2a', 'K3X9P2', 'k3x-p2', 'k3x p2', 'k3x9p2\n', ' k3x9p2', 'ñ3x9p2'])(
    'rejects %j',
    (id) => {
      expect(isValidRoomId(id)).toBe(false)
    },
  )
})

describe('toPeerId', () => {
  it('prefixes sddttt-', () => {
    expect(toPeerId('k3x9p2')).toBe('sddttt-k3x9p2')
  })
})
