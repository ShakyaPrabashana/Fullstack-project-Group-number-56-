/* A miniature of the board itself: mostly empty, a few slots hatched out,
   one claimed. It says what the product does before you read a word. */
const PATTERN = [
  '..xx....x...',
  '....x..oo...',
  'xx......x...',
  '...x....x.xx',
  '.x...xx.....',
  '....x....x..',
]

function Mini() {
  return (
    <div className="mini" aria-hidden="true">
      {PATTERN.map((row, r) => (
        <div key={r} className="mini__row">
          {[...row].map((c, i) => (
            <span
              key={i}
              className={
                c === 'x' ? 'mini__cell mini__cell--taken' : c === 'o' ? 'mini__cell mini__cell--mine' : 'mini__cell'
              }
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function AuthShell({ title, lede, children, footer }) {
  return (
    <div className="auth">
      <section className="auth__side">
        <div className="auth__brand">
          <span className="auth__mark">Campus</span>
          <span className="auth__mark auth__mark--thin">Book</span>
        </div>
        <p className="auth__pitch">
          Every room and every kit on campus, on one board. See what is free, take it
          before someone else does.
        </p>
        <Mini />
        <p className="auth__legend">
          <span className="auth__key auth__key--taken" /> taken
          <span className="auth__key auth__key--mine" /> yours
          <span className="auth__key auth__key--free" /> free
        </p>
      </section>

      <section className="auth__main">
        <div className="auth__form">
          <h1 className="auth__title">{title}</h1>
          <p className="auth__lede">{lede}</p>
          {children}
          <p className="auth__footer">{footer}</p>
        </div>
      </section>
    </div>
  )
}
