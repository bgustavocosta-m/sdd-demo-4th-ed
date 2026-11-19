import { Peer, type PeerOptions } from 'peerjs'

/**
 * The one place broker options live. Empty = PeerJS cloud broker (0.peerjs.com) with
 * PeerJS's default STUN/TURN servers (#2). Swap host/port/path here to self-host later.
 */
const OPTIONS: PeerOptions = {}

/** Data connections always use these (#2: `reliable` defaults to an unordered channel). */
export const CONNECT_OPTIONS = { reliable: true, serialization: 'json' } as const

export function createPeer(id?: string): Peer {
  return id === undefined ? new Peer(OPTIONS) : new Peer(id, OPTIONS)
}
