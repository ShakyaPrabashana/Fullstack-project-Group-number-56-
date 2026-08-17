import { bookableDays, longDate } from '../lib/time'

export default function DateStrip({ day, onDay, countsByDay }) {
  const days = bookableDays(7)

  return (
    <div className="datestrip">
      <div className="datestrip__lead">
        <h1 className="datestrip__date">{longDate(day)}</h1>
        <p className="datestrip__hint">
          Pick a free window on any row. Grey hatching is already taken.
        </p>
      </div>

      <div className="datestrip__days" role="group" aria-label="Choose a day">
        {days.map((d) => {
          const held = countsByDay[d.iso] ?? 0
          return (
            <button
              key={d.iso}
              type="button"
              className={d.iso === day ? 'daybtn daybtn--on' : 'daybtn'}
              aria-pressed={d.iso === day}
              onClick={() => onDay(d.iso)}
            >
              <span className="daybtn__weekday">{d.isToday ? 'Today' : d.weekday}</span>
              <span className="daybtn__num">{d.dayNum}</span>
              <span className="daybtn__month">{d.month}</span>
              <span className={held ? 'daybtn__load daybtn__load--some' : 'daybtn__load'}>
                {held ? `${held} held` : 'free'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
