import { isMessage, type Message } from './protocol'

/** Both peers ping this often (#3). */
export const PING_EVERY_MS = 2000
/** No ping for this long and the other side is gone (#3). */
export const LOST_AFTER_MS = 6000

/** The slice of a PeerJS `DataConnection` the heartbeat needs. */
export type HeartbeatConn = {
  open: boolean
  send: (msg: Message) => void
  on(event: 'data', fn: (raw: unknown) => void): void
  on(event: 'close', fn: () => void): void
  off(event: 'data', fn: (raw: unknown) => void): void
  off(event: 'close', fn: () => void): void
}

/**
 * App-level liveness (#2): sends a `ping` every 2 s and calls `onLost` once, when the connection
 * closes or no `ping` has arrived for 6 s. Returns `stop()`, which clears its timers and listeners.
 */
export function startHeartbeat(conn: HeartbeatConn, onLost: () => void): () => void {
  let silence: ReturnType<typeof setTimeout> | undefined

  const lost = () => {
    stop()
    onLost()
  }
  const resetSilence = () => {
    clearTimeout(silence)
    silence = setTimeout(lost, LOST_AFTER_MS)
  }
  const onData = (raw: unknown) => {
    if (isMessage(raw) && raw.type === 'ping') resetSilence()
  }

  const pinger = setInterval(() => {
    if (conn.open) conn.send({ type: 'ping' })
  }, PING_EVERY_MS)
  conn.on('data', onData)
  conn.on('close', lost)
  resetSilence()

  function stop() {
    clearInterval(pinger)
    clearTimeout(silence)
    conn.off('data', onData)
    conn.off('close', lost)
  }
  return stop
}
