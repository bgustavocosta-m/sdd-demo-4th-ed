import type { Peer } from 'peerjs'

/**
 * Test double for the slice of PeerJS that `host.ts` and `guest.ts` use. Not imported by the app.
 * Events are fired by hand with `emit`; nothing touches the network.
 */
type Handler = (...args: unknown[]) => void

class Emitter {
  private handlers = new Map<string, Handler[]>()

  on(event: string, handler: Handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler])
    return this
  }

  off(event: string, handler: Handler) {
    this.handlers.set(event, (this.handlers.get(event) ?? []).filter((h) => h !== handler))
    return this
  }

  emit(event: string, ...args: unknown[]) {
    for (const h of this.handlers.get(event) ?? []) h(...args)
  }
}

export class FakeConn extends Emitter {
  open = false
  sent: unknown[] = []
  closedWith: { flush?: boolean } | undefined | null = null

  send(msg: unknown) {
    this.sent.push(msg)
  }

  close(options?: { flush?: boolean }) {
    this.closedWith = options
    this.open = false
  }

  /** Simulates the data channel opening. */
  fireOpen() {
    this.open = true
    this.emit('open')
  }
}

export class FakePeer extends Emitter {
  destroyed = false
  conns: FakeConn[] = []
  readonly id: string | undefined

  constructor(id?: string) {
    super()
    this.id = id
  }

  connect(_peerId: string, _options?: unknown) {
    const conn = new FakeConn()
    this.conns.push(conn)
    return conn
  }

  destroy() {
    this.destroyed = true
  }

  error(type: string) {
    this.emit('error', Object.assign(new Error(type), { type }))
  }
}

/** A `createPeer` stand-in that records every Peer it makes. */
export function fakePeerFactory() {
  const peers: FakePeer[] = []
  const createPeer = (id?: string) => {
    const peer = new FakePeer(id)
    peers.push(peer)
    return peer as unknown as Peer
  }
  return { peers, createPeer }
}
