import { describe, expect, it } from 'vitest'
import { newGame, type GameState } from '../game/ticTacToe'
import { isMessage, type Message } from './protocol'

const state = newGame({ X: { name: 'Host', emoji: '' }, O: { name: 'Guest', emoji: '' } }, 'X')
const played: GameState = { ...state, board: ['X', 'O', null, null, null, null, null, null, null], turn: 'X' }
const won: GameState = {
  ...state,
  board: ['X', 'X', 'X', 'O', 'O', null, null, null, null],
  winner: 'X',
  winningLine: [0, 1, 2],
  turn: 'O',
}

describe('isMessage', () => {
  const valid: Message[] = [
    { type: 'hello', name: 'Rui', emoji: '🐸' },
    { type: 'move', cell: 0 },
    { type: 'move', cell: 8 },
    { type: 'rematch' },
    { type: 'ping' },
    { type: 'state', state },
    { type: 'state', state: played },
    { type: 'state', state: won },
    { type: 'room-full' },
  ]

  it.each(valid.map((m) => [m.type, m] as const))('accepts a valid %s', (_, msg) => {
    expect(isMessage(msg)).toBe(true)
  })

  it('accepts a message after a JSON round-trip', () => {
    expect(isMessage(JSON.parse(JSON.stringify({ type: 'state', state: won })))).toBe(true)
  })

  it.each([
    ['null', null],
    ['a string', 'move'],
    ['an array', [{ type: 'ping' }]],
    ['no type', { cell: 3 }],
    ['an unknown type', { type: 'chat', text: 'hi' }],
    ['a non-string type', { type: 1 }],
  ])('rejects %s', (_, x) => {
    expect(isMessage(x)).toBe(false)
  })

  it.each([
    ['missing cell', { type: 'move' }],
    ['cell -1', { type: 'move', cell: -1 }],
    ['cell 9', { type: 'move', cell: 9 }],
    ['fractional cell', { type: 'move', cell: 1.5 }],
    ['string cell', { type: 'move', cell: '4' }],
  ])('rejects move with %s', (_, x) => {
    expect(isMessage(x)).toBe(false)
  })

  it.each([
    ['missing name', { type: 'hello', emoji: '🐸' }],
    ['missing emoji', { type: 'hello', name: 'Rui' }],
    ['non-string name', { type: 'hello', name: 7, emoji: '🐸' }],
  ])('rejects hello with %s', (_, x) => {
    expect(isMessage(x)).toBe(false)
  })

  it.each([
    ['missing state', {}],
    ['a short board', { ...state, board: state.board.slice(0, 8) }],
    ['a bad cell value', { ...state, board: ['Z', ...state.board.slice(1)] }],
    ['a bad turn', { ...state, turn: 'Z' }],
    ['a bad winner', { ...state, winner: 'Z' }],
    ['a non-boolean draw', { ...state, draw: 'no' }],
    ['a bad winningLine', { ...state, winningLine: [0, 1, 9] }],
    ['a missing player', { ...state, players: { X: state.players.X } }],
    ['a player without a name', { ...state, players: { ...state.players, O: { emoji: '' } } }],
    ['a bad firstMover', { ...state, firstMover: null }],
  ])('rejects state with %s', (_, s) => {
    const msg = 'board' in s ? { type: 'state', state: s } : { type: 'state' }
    expect(isMessage(msg)).toBe(false)
  })
})
