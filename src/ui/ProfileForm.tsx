import { useId, useState, type FormEvent } from 'react'
import { EMOJIS, loadProfile, NAME_MAX, randomEmoji, saveProfile, validateName, type Profile } from '../profile/profile'
import styles from './ProfileForm.module.css'

type Props = {
  title: string
  /** e.g. "Create room" / "Join". */
  submitLabel: string
  /** Shown on the disabled button once submitted, e.g. "Creating…". */
  busyLabel: string
  busy: boolean
  onSubmit: (profile: Profile) => void
  onBack?: () => void
  /** Shown above the buttons, e.g. after a failed create. */
  error?: string
}

/** Name (1–16 chars, trimmed) and one of 12 animal emojis; prefilled from the last visit. */
export default function ProfileForm({ title, submitLabel, busyLabel, busy, onSubmit, onBack, error }: Props) {
  const [initial] = useState(() => loadProfile() ?? { name: '', emoji: randomEmoji() })
  const [name, setName] = useState(initial.name)
  const [emoji, setEmoji] = useState(initial.emoji)
  const nameId = useId()
  const hintId = useId()

  const valid = validateName(name)
  const length = [...name.trim()].length
  const tooLong = length > NAME_MAX

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (busy || valid === null) return
    const profile = { name: valid, emoji }
    saveProfile(profile)
    onSubmit(profile)
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <h1>{title}</h1>

      <label className={styles.field} htmlFor={nameId}>
        <span className={styles.label}>Your name</span>
        <input
          id={nameId}
          className={styles.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="nickname"
          autoFocus
          disabled={busy}
          aria-invalid={tooLong}
          aria-describedby={hintId}
        />
        <span id={hintId} className={`${styles.hint} ${tooLong ? styles.error : ''}`}>
          {tooLong ? `Too long: ${length}/${NAME_MAX}` : `${length}/${NAME_MAX}`}
        </span>
      </label>

      <fieldset className={styles.emojis} disabled={busy}>
        <legend className={styles.label}>Your avatar</legend>
        <div className={styles.grid}>
          {EMOJIS.map((e) => (
            <label key={e} className={`${styles.emoji} ${e === emoji ? styles.picked : ''}`}>
              <input
                type="radio"
                name="emoji"
                value={e}
                checked={e === emoji}
                onChange={() => setEmoji(e)}
                className={styles.radio}
              />
              {e}
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className={`${styles.error} ${styles.alert}`} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={busy || valid === null}>
          {busy ? busyLabel : submitLabel}
        </button>
        {onBack && (
          <button type="button" className={styles.secondary} onClick={onBack}>
            Back
          </button>
        )}
      </div>
    </form>
  )
}
