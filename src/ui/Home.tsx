import styles from './Home.module.css'

type Props = {
  onPickTicTacToe: () => void
}

export default function Home({ onPickTicTacToe }: Props) {
  return (
    <main className={styles.home}>
      <h1 className={styles.title}>Play with a friend</h1>
      <p className={styles.lead}>Pick a game, create a room and share the link.</p>
      <ul className={styles.games}>
        <li>
          <button type="button" className={styles.game} onClick={onPickTicTacToe}>
            <span className={styles.icon} aria-hidden="true">
              ❌⭕
            </span>
            <span className={styles.name}>Tic-Tac-Toe</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className={styles.game}
            disabled
            aria-describedby="checkers-soon"
          >
            <span className={styles.icon} aria-hidden="true">
              ⚫⚪
            </span>
            <span className={styles.name}>Checkers</span>
            <span id="checkers-soon" className={styles.soon}>
              coming soon
            </span>
          </button>
        </li>
      </ul>
    </main>
  )
}
