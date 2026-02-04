import { useState, useEffect } from 'react';
import { apiGet, apiUrl, getImageUrl, getCarImages } from '../../api';
import { confirm, showError } from '../../lib/swal';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='60'%3E%3Crect fill='%23e5e7eb' width='80' height='60'/%3E%3C/svg%3E";

function toKey(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function AdminAvailability() {
  const [cars, setCars] = useState([]);
  const [carsLoading, setCarsLoading] = useState(true);
  const [carId, setCarId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [unavailable, setUnavailable] = useState([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    apiGet('/cars')
      .then(setCars)
      .catch(() => {})
      .finally(() => setCarsLoading(false));
  }, []);

  useEffect(() => {
    if (!carId) {
      setUnavailable([]);
      return;
    }
    setAvailLoading(true);
    apiGet(`/availability?carId=${carId}&year=${year}&month=${month}`)
      .then((res) => setUnavailable(res.dates || []))
      .catch(() => setUnavailable([]))
      .finally(() => setAvailLoading(false));
  }, [carId, year, month]);

  const toggleDate = (date) => {
    if (toggling) return;
    const isUnav = unavailable.includes(date);
    if (isUnav) {
      confirm({
        title: 'Mark as available?',
        text: `Mark ${date} as available again?`,
        icon: 'question',
      }).then((ok) => {
        if (!ok) return;
        doToggle(date);
      });
    } else {
      doToggle(date);
    }
  };

  const doToggle = (date) => {
    const isUnav = unavailable.includes(date);
    setToggling(true);
    fetch(apiUrl('/availability'), {
      method: isUnav ? 'DELETE' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carId, dates: [date] }),
    })
      .then(() => apiGet(`/availability?carId=${carId}&year=${year}&month=${month}`))
      .then((res) => setUnavailable(res.dates || []))
      .catch((err) => showError(err.message))
      .finally(() => setToggling(false));
  };

  const set = new Set(unavailable);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(<div key={`p-${i}`} className="calendar-cell other-month" aria-hidden="true" />);
  for (let day = 1; day <= daysInMonth; day++) {
    const key = toKey(year, month, day);
    const unav = set.has(key);
    cells.push(
      <div
        key={key}
        className={`calendar-cell ${unav ? 'unavailable' : ''}`}
        style={{ cursor: carId && !toggling ? 'pointer' : 'default' }}
        title={key}
        onClick={() => carId && !toggling && toggleDate(key)}
        role="button"
        tabIndex={carId ? 0 : undefined}
        onKeyDown={(e) => carId && !toggling && e.key === 'Enter' && toggleDate(key)}
        aria-label={unav ? `Remove unavailable: ${key}` : `Mark unavailable: ${key}`}
      >
        {unav ? '🚗' : day}
      </div>
    );
  }
  const total = startPad + daysInMonth;
  const trailing = (7 - (total % 7)) % 7;
  for (let i = 0; i < trailing; i++) cells.push(<div key={`t-${i}`} className="calendar-cell other-month" aria-hidden="true" />);

  const selectedCar = cars.find((c) => c._id === carId);

  return (
    <>
      <h1>Availability Management</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>Click a car on the left to view and manage its availability on the calendar.</p>

      {carsLoading ? (
        <div className="loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', minHeight: 320 }}>
          <Spinner />
          <span>Loading cars...</span>
        </div>
      ) : cars.length === 0 ? (
        <div className="card">
          <EmptyState icon="🚗" title="No cars" description="Add cars first, then manage their availability." />
        </div>
      ) : (
        <div className="admin-availability-layout">
          <aside className="admin-availability-cars">
            <h2 className="admin-availability-side-title">Cars</h2>
            <ul className="admin-availability-car-list" role="list">
              {cars.map((car) => (
                <li key={car._id}>
                  <button
                    type="button"
                    className={`admin-availability-car-item ${carId === car._id ? 'selected' : ''}`}
                    onClick={() => setCarId(car._id)}
                  >
                    <span className="admin-availability-car-cell-img">
                      <img
                        src={getImageUrl(getCarImages(car)[0]) || PLACEHOLDER}
                        alt=""
                        onError={(e) => { e.target.src = PLACEHOLDER; }}
                      />
                    </span>
                    <span className="admin-availability-car-cell-title">{car.name}</span>
                    <span className="admin-availability-car-cell-price">₱{Number(car.pricePerDay).toLocaleString()}/day</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <div className="admin-availability-calendar">
            {!carId ? (
              <div className="card card-body admin-availability-placeholder">
                <p style={{ color: 'var(--gray-500)', margin: 0 }}>Select a car to view and manage availability.</p>
              </div>
            ) : (
              <div className="card card-body">
                <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.125rem' }}>{selectedCar?.name}</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>Click a date to toggle unavailable.</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setYear(prevYear); setMonth(prevMonth); }} disabled={availLoading}>← Prev</button>
                  <strong style={{ fontSize: '1rem' }}>{first.toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setYear(nextYear); setMonth(nextMonth); }} disabled={availLoading}>Next →</button>
                </div>
                {availLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', minHeight: 280, justifyContent: 'center' }}>
                    <Spinner size="sm" />
                    <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>Loading...</span>
                  </div>
                ) : (
                  <>
                    <div className="calendar-header">
                      {DAYS.map((d) => <span key={d}>{d}</span>)}
                    </div>
                    <div className="calendar-grid">{cells}</div>
                    <div className="legend">
                      <span className="legend-item"><span className="legend-dot available" /> Available</span>
                      <span className="legend-item"><span className="legend-dot unavailable" /> Unavailable (click to remove)</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
