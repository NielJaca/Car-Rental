import { useState, useEffect } from 'react';
import { apiGet } from '../api';
import Spinner from './Spinner';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function Calendar({ carId }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [unavailable, setUnavailable] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!carId) return;
    setLoading(true);
    apiGet(`/availability?carId=${carId}&year=${year}&month=${month}`)
      .then((res) => setUnavailable(res.dates || []))
      .catch(() => setUnavailable([]))
      .finally(() => setLoading(false));
  }, [carId, year, month]);

  if (!carId) return null;

  const set = new Set(unavailable);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const monthName = first.toLocaleString('default', { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(<div key={`pad-${i}`} className="calendar-cell other-month" aria-hidden="true" />);
  for (let day = 1; day <= daysInMonth; day++) {
    const key = toDateKey(year, month, day);
    const unav = set.has(key);
    cells.push(
      <div key={key} className={`calendar-cell ${unav ? 'unavailable' : ''}`} title={key} aria-label={unav ? `${key} not available` : `${key} available`}>
        {unav ? '🚗' : day}
      </div>
    );
  }
  const total = startPad + daysInMonth;
  const trailing = (7 - (total % 7)) % 7;
  for (let i = 0; i < trailing; i++) cells.push(<div key={`trail-${i}`} className="calendar-cell other-month" aria-hidden="true" />);

  if (loading) {
    return (
      <div className="calendar-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', minHeight: 340 }}>
        <Spinner />
        <span style={{ fontSize: '0.9375rem', color: 'var(--gray-500)' }}>Loading availability...</span>
      </div>
    );
  }

  return (
    <div className="calendar-wrap">
      <div className="calendar-nav">
        <span className="calendar-nav-title">{monthName}</span>
        <div className="calendar-nav-btns">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { setYear(prevYear); setMonth(prevMonth); }}
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { setYear(nextYear); setMonth(nextMonth); }}
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>
      <div className="calendar-header">
        {DAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="calendar-grid">{cells}</div>
      <div className="availability-legend">
        <p className="availability-legend-title">How to read</p>
        <div className="availability-legend-items">
          <div className="availability-legend-item available">
            <span className="legend-icon" aria-hidden="true">&nbsp;</span>
            <span><strong>Empty cell</strong> = Available for booking</span>
          </div>
          <div className="availability-legend-item unavailable">
            <span className="legend-icon" aria-hidden="true">🚗</span>
            <span><strong>Car icon</strong> = Not available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
