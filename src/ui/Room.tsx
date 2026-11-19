import { useEffect, useRef, useState } from 'react'
import type { GameState, Player } from '../game/ticTacToe'
import { joinRoom } from '../net/guest'
import { hostRoom } from '../net/host'
import Board from './Board'
import styles from './Room.module.css'

// Placeholder players until the profile form lands (#10).
const HOST: Player = { name: 'Host', emoji: '' }
const GUEST: Player = { name: 'Guest', emoji: '' }

type Props =
  | { role: 'host'; onOpen: (roomId: string) => void; onBack: () => void }
  | { role: 'guest'; roomId: string }

/**
 * Host: form → creating → waiting → playing.  Guest: form → connecting → playing.
 * Owns the PeerJS session: created in one effect, destroyed in its cleanup (StrictMode-safe).
 */
export default function Room(props: Props) {
  const [started, setStarted] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(props.role === 'guest' ? props.roomId : null)
  const [state, setState] = useState<GameState | null>(null)
  const moveRef = useRef<((cell: number) => void) | null>(null)

  const onOpenRef = useRef(props.role === 'host' ? props.onOpen : undefined)
  useEffect(() => {
    onOpenRef.current = props.role === 'host' ? props.onOpen : undefined
  })

  const guestRoomId = props.role === 'guest' ? props.roomId : null

  useEffect(() => {
    if (!started) return
    const session =
      guestRoomId === null
        ? (() => {
            const s = hostRoom({
              player: HOST,
              onOpen: (id) => {
                setRoomId(id)
                onOpenRef.current?.(id)
              },
              onState: setState,
            })
            return { move: s.makeMove, destroy: s.destroy }
          })()
        : joinRoom({ roomId: guestRoomId, player: GUEST, onState: setState })
    moveRef.current = session.move
    return () => {
      session.destroy()
      moveRef.current = null
      setState(null)
    }
  }, [started, guestRoomId])

  if (state) {
    return (
      <main className={styles.room}>
        <Board
          state={state}
          me={props.role === 'host' ? 'X' : 'O'}
          onMove={(cell) => moveRef.current?.(cell)}
        />
      </main>
    )
  }

  if (props.role === 'guest') {
    return (
      <main className={styles.room}>
        <h1>Join room {props.roomId}</h1>
        <p>You'll play as {GUEST.name} (O).</p>
        <button
          type="button"
          className={styles.primary}
          disabled={started}
          onClick={() => setStarted(true)}
        >
          {started ? 'Connecting…' : 'Join'}
        </button>
      </main>
    )
  }

  if (roomId) {
    return (
      <main className={styles.room}>
        <h1>Room {roomId}</h1>
        <p className={styles.waiting}>Waiting for opponent…</p>
        <ShareLink url={`${location.origin}${import.meta.env.BASE_URL}#/room/${roomId}`} />
      </main>
    )
  }

  return (
    <main className={styles.room}>
      <h1>Tic-Tac-Toe</h1>
      <p>You'll play as {HOST.name} (X).</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          disabled={started}
          onClick={() => setStarted(true)}
        >
          {started ? 'Creating…' : 'Create room'}
        </button>
        <button type="button" className={styles.secondary} onClick={props.onBack}>
          Back
        </button>
      </div>
    </main>
  )
}

function ShareLink({ url }: { url: string }) {
  const [copiedAt, setCopiedAt] = useState(0)

  useEffect(() => {
    if (!copiedAt) return
    const t = setTimeout(() => setCopiedAt(0), 2000)
    return () => clearTimeout(t)
  }, [copiedAt])

  const copy = () => {
    // Without the Clipboard API (e.g. plain http) the link stays visible and selectable.
    navigator.clipboard?.writeText(url).then(
      () => setCopiedAt(Date.now()),
      () => {},
    )
  }

  return (
    <div className={styles.share}>
      <input
        className={styles.link}
        readOnly
        value={url}
        aria-label="Room link"
        onFocus={(e) => e.currentTarget.select()}
      />
      <button type="button" className={styles.primary} onClick={copy}>
        {copiedAt ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  )
}
