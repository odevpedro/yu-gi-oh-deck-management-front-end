import { useState } from 'react'
import { isSoundEnabled, toggleSound, playButton } from '../utils/sound'

export default function SoundToggle() {
  const [on, setOn] = useState(isSoundEnabled())

  function handleToggle() {
    playButton()
    setOn(toggleSound())
  }

  return (
    <button type="button" className="sound-toggle" onClick={handleToggle} title={on ? 'Desligar som' : 'Ligar som'}>
      {on ? '🔊' : '🔇'}
    </button>
  )
}