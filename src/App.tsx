import { useState } from 'react'
import { navigate, useHashRoute } from './router'
import Home from './ui/Home'
import styles from './App.module.css'

export default function App() {
  const route = useHashRoute()
  // Placeholder until the create flow (ProfileForm + hostRoom) lands.
  const [creating, setCreating] = useState(false)

  if (route.name === 'room') {
    return (
      <main className={styles.placeholder}>
        <h1>Room {route.id}</h1>
        <p>Joining rooms is coming in a later build.</p>
        <BackHome />
      </main>
    )
  }

  if (creating) {
    return (
      <main className={styles.placeholder}>
        <h1>Tic-Tac-Toe</h1>
        <p>Creating rooms is coming in a later build.</p>
        <BackHome onClick={() => setCreating(false)} />
      </main>
    )
  }

  return <Home onPickTicTacToe={() => setCreating(true)} />
}

function BackHome({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      className={styles.back}
      onClick={() => {
        onClick?.()
        navigate('#/')
      }}
    >
      Back to home
    </button>
  )
}
