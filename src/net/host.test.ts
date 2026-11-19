import { describe, expect, it } from 'vitest'
import { applyMove, newGame } from '../game/ticTacToe'
import { handleGuestMessage } from './host'

const start = newGame({ X: { name: 'Host', emoji: '' }, O: { name: 'Guest', emoji: '' } }, 'X')

describe('handleGuestMessage', () => {
  it('answers hello with the state, naming the guest as O', () => {
    const { state, send } = handleGuestMessage(start, { type: 'hello', name: 'Rui', emoji: '🐸' })
    expect(state.players).toEqual({ X: start.players.X, O: { name: 'Rui', emoji: '🐸' } })
    expect(state.board).toEqual(start.board)
    expect(send).toEqual({ type: 'state', state })
  })

  it('trims the guest name and keeps a duplicate emoji', () => {
    const fox = newGame({ X: { name: 'Ana', emoji: '🦊' }, O: { name: 'Guest', emoji: '' } }, 'X')
    const { state } = handleGuestMessage(fox, { type: 'hello', name: '  Rui ', emoji: '🦊' })
    expect(state.players.O).toEqual({ name: 'Rui', emoji: '🦊' })
  })

  it.each([
    ['an empty name', '   ', '🐸', { name: 'Guest', emoji: '🐸' }],
    ['a name over 16 chars', 'x'.repeat(17), '🐸', { name: 'Guest', emoji: '🐸' }],
    ['an emoji outside the grid', 'Rui', '🍕', { name: 'Rui', emoji: '' }],
  ])('falls back to defaults for %s', (_, name, emoji, player) => {
    const { state } = handleGuestMessage(start, { type: 'hello', name, emoji })
    expect(state.players.O).toEqual(player)
  })

  it('applies a legal guest move as O and sends the new state', () => {
    const oTurn = applyMove(start, 'X', 4)!
    const { state, send } = handleGuestMessage(oTurn, { type: 'move', cell: 0 })
    expect(state.board[0]).toBe('O')
    expect(state.turn).toBe('X')
    expect(send).toEqual({ type: 'state', state })
  })

  it.each([
    ['out of turn', start, 0],
    ['on a taken cell', applyMove(start, 'X', 4)!, 4],
  ])('ignores a move %s and re-sends the unchanged state', (_, before, cell) => {
    const { state, send } = handleGuestMessage(before, { type: 'move', cell })
    expect(state).toBe(before)
    expect(send).toEqual({ type: 'state', state: before })
  })

  it('ignores a move after the game is over and re-sends the state', () => {
    // X: 0 1 2 — O: 3 4
    let over = start
    for (const [mark, cell] of [['X', 0], ['O', 3], ['X', 1], ['O', 4], ['X', 2]] as const) {
      over = applyMove(over, mark, cell)!
    }
    const { state, send } = handleGuestMessage(over, { type: 'move', cell: 5 })
    expect(state).toBe(over)
    expect(send).toEqual({ type: 'state', state: over })
  })

  it.each([{ type: 'ping' }, { type: 'state', state: start }, { type: 'room-full' }] as const)(
    'leaves the state alone and sends nothing for $type',
    (msg) => {
      expect(handleGuestMessage(start, msg)).toEqual({ state: start, send: null })
    },
  )
})
