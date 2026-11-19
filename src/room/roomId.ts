const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const LENGTH = 6
const ROOM_ID = /^[a-z0-9]{6}$/

/** 6 random chars of `[a-z0-9]`, from `crypto.getRandomValues`. */
export function generateRoomId(): string {
  // 252 is the largest multiple of 36 below 256: rejecting bytes ≥ 252 keeps every char equally likely.
  let id = ''
  while (id.length < LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(LENGTH))) {
      if (byte < 252 && id.length < LENGTH) id += ALPHABET[byte % 36]
    }
  }
  return id
}

export function isValidRoomId(id: string): boolean {
  return ROOM_ID.test(id)
}

/** The host's PeerJS id; the prefix keeps us clear of other apps on the shared broker. */
export function toPeerId(roomId: string): string {
  return `sddttt-${roomId}`
}
