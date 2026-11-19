import { describe, expect, it } from 'vitest'
import { parseHash } from './router'

describe('parseHash', () => {
  it.each(['', '#', '#/'])('maps %j to home', (hash) => {
    expect(parseHash(hash)).toEqual({ name: 'home' })
  })

  it('maps #/room/<id> to the room route', () => {
    expect(parseHash('#/room/abc123')).toEqual({ name: 'room', id: 'abc123' })
  })

  it('ignores a trailing slash after the room id', () => {
    expect(parseHash('#/room/abc123/')).toEqual({ name: 'room', id: 'abc123' })
  })

  it.each(['#/room', '#/room/', '#/nope', '#/room/abc/extra', '#room/abc123', '#/rooms/abc123'])(
    'falls back to home for %j',
    (hash) => {
      expect(parseHash(hash)).toEqual({ name: 'home' })
    },
  )
})
