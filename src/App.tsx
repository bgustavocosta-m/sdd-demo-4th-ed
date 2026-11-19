import { useState } from 'react'
import { navigate, useHashRoute } from './router'
import Home from './ui/Home'
import Room from './ui/Room'

export default function App() {
  const route = useHashRoute()
  // Set while this tab hosts a room. `roomId` is null until the Peer is open; only then do we navigate.
  const [hosting, setHosting] = useState<{ roomId: string | null } | null>(null)

  // The host's Room stays mounted from Home (creating) to `#/room/<id>`; leaving that route ends the room.
  const onHostRoute =
    hosting !== null &&
    (hosting.roomId === null
      ? route.name === 'home'
      : route.name === 'room' && route.id === hosting.roomId)
  if (hosting && !onHostRoute) setHosting(null)

  if (hosting && onHostRoute) {
    return (
      <Room
        key="host"
        role="host"
        onOpen={(roomId) => {
          navigate(`#/room/${roomId}`) // synchronous, so the next render already sees the room route
          setHosting({ roomId })
        }}
        onBack={() => setHosting(null)}
      />
    )
  }

  // Every tab that isn't hosting this room is a guest (#4).
  if (route.name === 'room') return <Room key={route.id} role="guest" roomId={route.id} />

  return <Home onPickTicTacToe={() => setHosting({ roomId: null })} />
}
