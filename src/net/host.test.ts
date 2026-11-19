import { describe, expect, it, vi } from 'vitest'
import { applyMove, isOver, newGame, type GameState } from '../game/ticTacToe'
import { toPeerId } from '../room/roomId'
import { FakeConn, fakePeerFactory } from './fakePeer'
import { CREATE_TRIES, handleGuestMessage, hostRoom } from './host'

/** Plays the cells in order, from whoever's turn it is. */
const play = (state: GameState, cells: number[]) =>
  cells.reduce((s, cell) => applyMove(s, s.turn, cell)!, state)

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

describe('handleGuestMessage rematch', () => {
  it('is ignored before the game is over', () => {
    const midGame = play(start, [4, 0])
    expect(handleGuestMessage(start, { type: 'rematch' })).toEqual({ state: start, send: null })
    expect(handleGuestMessage(midGame, { type: 'rematch' })).toEqual({ state: midGame, send: null })
  })

  it('after game over, resets the board and sends the new state', () => {
    const won = play(start, [0, 3, 1, 4, 2]) // X wins on the top row
    const { state, send } = handleGuestMessage(won, { type: 'rematch' })
    expect(state).toEqual(newGame(start.players, 'O'))
    expect(send).toEqual({ type: 'state', state })
  })

  it('alternates the first mover across several rematches', () => {
    let state = start
    const firstMovers: string[] = [state.turn]
    for (let game = 0; game < 4; game++) {
      // Whoever starts takes the left column; the other plays the middle column.
      state = play(state, [0, 1, 3, 4, 6])
      expect(isOver(state)).toBe(true)
      state = handleGuestMessage(state, { type: 'rematch' }).state
      expect(state.board.every((c) => c === null)).toBe(true)
      expect(state.turn).toBe(state.firstMover)
      firstMovers.push(state.firstMover)
    }
    expect(firstMovers).toEqual(['X', 'O', 'X', 'O', 'X'])
  })
})

describe('hostRoom', () => {
  const player = { name: 'Al', emoji: '🦊' }

  function setup() {
    const { peers, createPeer } = fakePeerFactory()
    const onOpen = vi.fn()
    const onState = vi.fn()
    const onFail = vi.fn()
    const session = hostRoom({ player, onOpen, onState, onFail }, createPeer)
    return { peers, session, onOpen, onState, onFail }
  }

  it('makes up to 3 tries in total', () => {
    expect(CREATE_TRIES).toBe(3)
  })

  it('retries with a new room ID and a new Peer on unavailable-id', () => {
    const { peers, onOpen, onFail } = setup()
    peers[0].error('unavailable-id')
    expect(peers).toHaveLength(2)
    expect(peers[1].id).not.toBe(peers[0].id)
    expect(peers[0].destroyed).toBe(true)

    peers[1].emit('open', peers[1].id)
    expect(onOpen).toHaveBeenCalledOnce()
    expect(toPeerId(onOpen.mock.calls[0][0])).toBe(peers[1].id)
    expect(onFail).not.toHaveBeenCalled()
  })

  it('gives up after 3 taken IDs', () => {
    const { peers, onOpen, onFail } = setup()
    for (let i = 0; i < CREATE_TRIES; i++) peers[i].error('unavailable-id')
    expect(peers).toHaveLength(CREATE_TRIES)
    expect(onFail).toHaveBeenCalledOnce()
    expect(onOpen).not.toHaveBeenCalled()
    expect(peers.every((p) => p.destroyed)).toBe(true)
  })

  it('ignores events from a Peer it has given up on', () => {
    const { peers, onOpen } = setup()
    peers[0].error('unavailable-id')
    peers[0].emit('open', peers[0].id)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('destroy() destroys the current Peer and stops retrying', () => {
    const { peers, session, onFail } = setup()
    peers[0].error('unavailable-id')
    session.destroy()
    expect(peers[1].destroyed).toBe(true)
    peers[1].error('unavailable-id')
    expect(peers).toHaveLength(2)
    expect(onFail).not.toHaveBeenCalled()
  })

  it('tells a third visitor the room is full, flushing before closing, and keeps the game going', () => {
    const { peers, session, onState } = setup()
    const peer = peers[0]
    peer.emit('open', peer.id)

    const guest = new FakeConn()
    peer.emit('connection', guest)
    guest.fireOpen()
    guest.emit('data', { type: 'hello', name: 'Bo', emoji: '🐼' })

    const third = new FakeConn()
    peer.emit('connection', third)
    third.fireOpen()
    expect(third.sent).toEqual([{ type: 'room-full' }])
    expect(third.closedWith).toEqual({ flush: true })

    // The third visitor's messages are ignored; the game between the first two carries on.
    third.emit('data', { type: 'move', cell: 0 })
    third.emit('close')
    session.makeMove(4)
    guest.emit('data', { type: 'move', cell: 0 })
    const last = onState.mock.calls.at(-1)![0] as GameState
    expect(last.board[4]).toBe('X')
    expect(last.board[0]).toBe('O')
    expect(guest.closedWith).toBeNull()
  })
})
