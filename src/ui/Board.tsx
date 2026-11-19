import { isOver, type GameState, type Mark, type Player } from '../game/ticTacToe'
import styles from './Board.module.css'

type Props = {
  state: GameState
  /** Which mark this browser plays. */
  me: Mark
  onMove: (cell: number) => void
  /** Shown once the game is over; the board resets for both players. */
  onRematch: () => void
}

const label = (p: Player) => (p.emoji ? `${p.emoji} ${p.name}` : p.name)

export default function Board({ state, me, onMove, onRematch }: Props) {
  const { board, turn, winner, draw, winningLine, players } = state
  const over = isOver(state)

  let status: string
  if (winner) status = `${label(players[winner])} wins!`
  else if (draw) status = "It's a draw"
  else status = `${label(players[turn])}'s turn${turn === me ? ' — your move' : ''}`

  return (
    <section className={styles.game}>
      <p className={styles.players}>
        {(['X', 'O'] as const).map((mark) => (
          <span
            key={mark}
            className={`${styles.player} ${!over && turn === mark ? styles.active : ''}`}
          >
            {label(players[mark])} ({mark}){mark === me ? ' · you' : ''}
          </span>
        ))}
      </p>

      <p className={styles.status} role="status">
        {status}
      </p>

      <div className={styles.board}>
        {board.map((cell, i) => {
          const winning = winningLine?.includes(i) ?? false
          return (
            <button
              key={i}
              type="button"
              className={`${styles.cell} ${winning ? styles.win : ''}`}
              aria-label={`Cell ${i + 1}, ${cell ?? 'empty'}`}
              disabled={over || turn !== me || cell !== null}
              onClick={() => onMove(i)}
            >
              {cell}
            </button>
          )
        })}
      </div>

      {over && (
        <button type="button" className={styles.rematch} onClick={onRematch}>
          Rematch
        </button>
      )}
    </section>
  )
}
