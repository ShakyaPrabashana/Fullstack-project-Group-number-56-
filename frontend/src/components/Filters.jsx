import { KINDS } from '../data/resources'

export default function Filters({ kind, onKind, query, onQuery, minCapacity, onMinCapacity, shown, total }) {
  return (
    <aside className="filters" aria-label="Filter resources">
      <div className="filters__group">
        <span className="filters__label">Type</span>
        <div className="segbar" role="group" aria-label="Resource type">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className={k === kind ? 'seg seg--on' : 'seg'}
              aria-pressed={k === kind}
              onClick={() => onKind(k)}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="filters__group">
        <label className="filters__label" htmlFor="q">
          Search
        </label>
        <input
          id="q"
          type="search"
          className="input"
          placeholder="Lab, projector, LT-1…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </div>

      <div className="filters__group">
        <label className="filters__label" htmlFor="cap">
          Fits at least
        </label>
        <div className="caprow">
          <input
            id="cap"
            type="range"
            className="range"
            min="1"
            max="180"
            step="1"
            value={minCapacity}
            onChange={(e) => onMinCapacity(Number(e.target.value))}
          />
          <output className="caprow__out" htmlFor="cap">
            {minCapacity === 1 ? 'anyone' : `${minCapacity} people`}
          </output>
        </div>
      </div>

      <p className="filters__count" role="status">
        Showing {shown} of {total} resources
      </p>

      <div className="legend">
        <span className="legend__title">Key</span>
        <span className="legend__row">
          <span className="legend__swatch legend__swatch--free" />
          Free
        </span>
        <span className="legend__row">
          <span className="legend__swatch legend__swatch--taken" />
          Taken by someone else
        </span>
        <span className="legend__row">
          <span className="legend__swatch legend__swatch--mine" />
          Yours
        </span>
      </div>
    </aside>
  )
}
