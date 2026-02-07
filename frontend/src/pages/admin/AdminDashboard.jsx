import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, getApiBase } from '../../api';
import Spinner from '../../components/Spinner';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

/* Base chart options: prevent overlap with lots of data */
const chartLayout = { padding: { top: 8, right: 12, bottom: 20, left: 8 } };
const chartOpts = {
  responsive: true,
  maintainAspectRatio: true,
  layout: chartLayout,
  plugins: { legend: { display: true, position: 'top' } },
};
/* Options for charts with many x-axis labels (e.g. months) - avoid overlap */
const manyLabelsX = {
  ticks: { maxRotation: 45, minRotation: 0, autoSkip: true, maxTicksLimit: 14, font: { size: 10 } },
  grid: { display: true },
};
/* Minimum height wrapper so charts don't collapse or overlap */
const chartWrapperStyle = { minHeight: 300, position: 'relative' };

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `₱${Number(n).toLocaleString()}`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [monthlyByStatus, setMonthlyByStatus] = useState(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [mostRented, setMostRented] = useState(null);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [upcomingReturns, setUpcomingReturns] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [error, setError] = useState(null);
  const [report, setReport] = useState({ from: '', to: '', format: 'pdf', status: 'all', carId: '' });
  const [cars, setCars] = useState([]);

  useEffect(() => {
    apiGet('/dashboard/stats')
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);
  useEffect(() => {
    apiGet('/dashboard/charts/monthly-bookings').then(setMonthly).catch(() => {});
    apiGet('/dashboard/charts/monthly-bookings-by-status').then(setMonthlyByStatus).catch(() => {});
    apiGet('/dashboard/charts/monthly-revenue').then(setMonthlyRevenue).catch(() => {});
    apiGet('/dashboard/charts/booking-growth').then(setGrowth).catch(() => {});
    apiGet('/dashboard/charts/most-rented-cars').then(setMostRented).catch(() => {});
    apiGet('/dashboard/upcoming-bookings').then(setUpcomingBookings).catch(() => {});
    apiGet('/dashboard/upcoming-returns').then(setUpcomingReturns).catch(() => {});
    apiGet('/dashboard/recent-bookings').then(setRecentBookings).catch(() => {});
    apiGet('/cars').then((data) => setCars(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  /* Prioritize soonest date first: pickups by startDate, returns by endDate */
  const sortedUpcomingBookings = useMemo(
    () => [...upcomingBookings].sort((a, b) => new Date(a.startDate) - new Date(b.startDate)),
    [upcomingBookings],
  );
  const sortedUpcomingReturns = useMemo(
    () => [...upcomingReturns].sort((a, b) => new Date(a.endDate) - new Date(b.endDate)),
    [upcomingReturns],
  );

  if (error) return <p className="error">{error}</p>;
  if (!stats) {
    return (
      <div className="loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <Spinner size="lg" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  const monthlyChart = monthly && {
    labels: monthly.labels,
    datasets: [{ label: 'Bookings', data: monthly.data, backgroundColor: 'rgba(160, 130, 109, 0.65)' }],
  };
  const monthlyByStatusChart = monthlyByStatus && {
    labels: monthlyByStatus.labels,
    datasets: [
      { label: 'Pending', data: monthlyByStatus.pending, backgroundColor: 'rgba(255, 193, 7, 0.7)' },
      { label: 'Confirmed', data: monthlyByStatus.confirmed, backgroundColor: 'rgba(107, 143, 113, 0.7)' },
    ],
  };
  const monthlyRevenueChart = monthlyRevenue && {
    labels: monthlyRevenue.labels,
    datasets: [{ label: 'Revenue', data: monthlyRevenue.data, borderColor: '#5a8b6f', backgroundColor: 'rgba(90, 139, 111, 0.15)', fill: true, tension: 0.3 }],
  };
  const growthChart = growth && {
    labels: growth.labels,
    datasets: [{ label: 'Bookings', data: growth.data, borderColor: '#8b6f5a', backgroundColor: 'rgba(160, 130, 109, 0.1)', fill: true, tension: 0.3 }],
  };
  const mostRentedChart = mostRented && {
    labels: mostRented.labels,
    datasets: [{ label: 'Bookings', data: mostRented.data, backgroundColor: 'rgba(107, 143, 113, 0.65)' }],
  };
  /* Bar: bookings this month by status */
  const bookingsThisMonthBarChart = {
    labels: ['Pending', 'Confirmed'],
    datasets: [
      {
        label: 'Bookings This Month',
        data: [stats.pendingThisMonth ?? 0, stats.confirmedThisMonth ?? 0],
        backgroundColor: ['rgba(255, 193, 7, 0.8)', 'rgba(107, 143, 113, 0.8)'],
        borderColor: ['#d4a017', '#6b8f71'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <>
      <h1>Dashboard</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>Overview of cars, bookings, and growth.</p>

      <div
        className="grid-2"
        style={{
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="stat-card">
          <p className="stat-label">Total Cars</p>
          <p className="stat-value">{stats.totalCars}</p>
        </div>
        <div className="stat-card success">
          <p className="stat-label">Available Today</p>
          <p className="stat-value">{stats.availableToday ?? '—'}</p>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--gray-400)' }}>
          <p className="stat-label">Unavailable Today</p>
          <p className="stat-value">{stats.unavailableToday ?? '—'}</p>
        </div>
        <div className="stat-card primary">
          <p className="stat-label">Total Bookings</p>
          <p className="stat-value">{stats.totalBookings}</p>
        </div>
        <div className="stat-card success">
          <p className="stat-label">Bookings This Month</p>
          <p className="stat-value">{stats.bookingsThisMonth}</p>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--success)' }}>
          <p className="stat-label">Confirmed This Month</p>
          <p className="stat-value">{stats.confirmedThisMonth ?? '—'}</p>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--warning, #d4a017)' }}>
          <p className="stat-label">Pending This Month</p>
          <p className="stat-value">{stats.pendingThisMonth ?? '—'}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Avg Booking (days)</p>
          <p className="stat-value">{stats.avgBookingDurationDays ?? '—'}</p>
        </div>
        <div className="stat-card primary">
          <p className="stat-label">Upcoming Pickups (7d)</p>
          <p className="stat-value">{stats.upcomingPickups ?? '—'}</p>
        </div>
        <div className="stat-card primary">
          <p className="stat-label">Upcoming Returns (7d)</p>
          <p className="stat-value">{stats.upcomingReturns ?? '—'}</p>
        </div>
        <div className="stat-card success">
          <p className="stat-label">Revenue This Month</p>
          <p className="stat-value">{formatMoney(stats.revenueThisMonth)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Monthly Growth</p>
          <p className="stat-value">{stats.growthPercent}%</p>
        </div>
      </div>

      <h2 style={{ marginTop: '2.5rem', marginBottom: '1rem' }}>Charts</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {monthlyChart && (
          <div className="card card-body" style={chartWrapperStyle}>
            <Bar
              data={monthlyChart}
              options={{
                ...chartOpts,
                plugins: { title: { display: true, text: 'Monthly Bookings' } },
                scales: { x: manyLabelsX, y: { beginAtZero: true, ticks: { stepSize: 1 } } },
              }}
            />
          </div>
        )}
        {monthlyByStatusChart && (
          <div className="card card-body" style={chartWrapperStyle}>
            <Bar
              data={monthlyByStatusChart}
              options={{
                ...chartOpts,
                plugins: { title: { display: true, text: 'Bookings by Status (Pending vs Confirmed)' }, legend: { position: 'top' } },
                scales: { x: { ...manyLabelsX, stacked: true }, y: { stacked: true, beginAtZero: true } },
              }}
            />
          </div>
        )}
        {monthlyRevenueChart && (
          <div className="card card-body" style={chartWrapperStyle}>
            <Line
              data={monthlyRevenueChart}
              options={{
                ...chartOpts,
                plugins: { title: { display: true, text: 'Revenue per Month (Confirmed)' } },
                scales: { x: manyLabelsX, y: { beginAtZero: true, ticks: { callback: (v) => (v ? `₱${Number(v).toLocaleString()}` : v) } } },
              }}
            />
          </div>
        )}
        {growthChart && (
          <div className="card card-body" style={chartWrapperStyle}>
            <Line
              data={growthChart}
              options={{
                ...chartOpts,
                plugins: { title: { display: true, text: 'Booking Growth' } },
                scales: { x: manyLabelsX, y: { beginAtZero: true } },
              }}
            />
          </div>
        )}
        {mostRentedChart && (
          <div className="card card-body" style={chartWrapperStyle}>
            <Bar
              data={mostRentedChart}
              options={{
                ...chartOpts,
                indexAxis: 'y',
                plugins: { title: { display: true, text: 'Most Rented Cars' } },
                scales: {
                  x: { beginAtZero: true },
                  y: { ticks: { autoSkip: true, maxTicksLimit: 15, font: { size: 10 } } },
                },
              }}
            />
          </div>
        )}
        <div className="card card-body" style={chartWrapperStyle}>
          <Bar
            data={bookingsThisMonthBarChart}
            options={{
              ...chartOpts,
              plugins: {
                title: { display: true, text: 'Bookings This Month (Pending vs Confirmed)' },
                legend: { display: false },
              },
              scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            }}
          />
        </div>
      </div>

      <h2 style={{ marginTop: '2.5rem', marginBottom: '1rem' }}>Upcoming Bookings (next 14 days)</h2>
      <div className="card dashboard-list dashboard-list--pickups">
        {sortedUpcomingBookings.length === 0 ? (
          <p style={{ padding: '1rem', color: 'var(--gray-500)', margin: 0 }}>No upcoming pickups in the next 14 days.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Car</th>
                  <th>Customer</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedUpcomingBookings.map((b) => (
                  <tr key={b._id}>
                    <td>{b.carId?.name ?? '—'}</td>
                    <td>{b.customerName ?? '—'}</td>
                    <td>{formatDate(b.startDate)}</td>
                    <td>{formatDate(b.endDate)}</td>
                    <td><span className={`badge badge-${b.status === 'confirmed' ? 'success' : 'warning'}`}>{b.status}</span></td>
                    <td>{formatMoney(b.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {sortedUpcomingBookings.length > 0 && (
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--gray-200)' }}>
            <Link to="/admin/bookings" className="btn btn-secondary btn-sm">View all bookings</Link>
          </div>
        )}
      </div>

      <h2 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Upcoming Returns (next 14 days)</h2>
      <div className="card dashboard-list dashboard-list--returns">
        {sortedUpcomingReturns.length === 0 ? (
          <p style={{ padding: '1rem', color: 'var(--gray-500)', margin: 0 }}>No upcoming returns in the next 14 days.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Car</th>
                  <th>Customer</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedUpcomingReturns.map((b) => (
                  <tr key={b._id}>
                    <td>{b.carId?.name ?? '—'}</td>
                    <td>{b.customerName ?? '—'}</td>
                    <td>{formatDate(b.startDate)}</td>
                    <td>{formatDate(b.endDate)}</td>
                    <td><span className={`badge badge-${b.status === 'confirmed' ? 'success' : 'warning'}`}>{b.status}</span></td>
                    <td>{formatMoney(b.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {sortedUpcomingReturns.length > 0 && (
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--gray-200)' }}>
            <Link to="/admin/bookings" className="btn btn-secondary btn-sm">View all bookings</Link>
          </div>
        )}
      </div>

      <h2 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Recent Bookings</h2>
      <div className="card">
        {recentBookings.length === 0 ? (
          <p style={{ padding: '1rem', color: 'var(--gray-500)', margin: 0 }}>No bookings yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Car</th>
                  <th>Customer</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b._id}>
                    <td>{b.carId?.name ?? '—'}</td>
                    <td>{b.customerName ?? '—'}</td>
                    <td>{formatDate(b.startDate)}</td>
                    <td>{formatDate(b.endDate)}</td>
                    <td><span className={`badge badge-${b.status === 'confirmed' ? 'success' : 'warning'}`}>{b.status}</span></td>
                    <td>{formatMoney(b.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {recentBookings.length > 0 && (
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--gray-200)' }}>
            <Link to="/admin/bookings" className="btn btn-secondary btn-sm">View all bookings</Link>
          </div>
        )}
      </div>

      <h2 style={{ marginTop: '2.5rem', marginBottom: '1rem' }}>Download Report</h2>
      <div className="card card-body">
        <p style={{ marginTop: 0, color: 'var(--gray-600)', fontSize: '0.9375rem' }}>
          Export bookings within your selected date range. Choose PDF, Excel, or CSV.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>From</label>
            <input type="date" className="form-control" value={report.from} onChange={(e) => setReport((r) => ({ ...r, from: e.target.value }))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>To</label>
            <input type="date" className="form-control" value={report.to} onChange={(e) => setReport((r) => ({ ...r, to: e.target.value }))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Car</label>
            <select className="form-control" value={report.carId} onChange={(e) => setReport((r) => ({ ...r, carId: e.target.value }))}>
              <option value="">All cars</option>
              {cars.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Status</label>
            <select className="form-control" value={report.status} onChange={(e) => setReport((r) => ({ ...r, status: e.target.value }))}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Format</label>
            <select className="form-control" value={report.format} onChange={(e) => setReport((r) => ({ ...r, format: e.target.value }))}>
              <option value="pdf">PDF</option>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const params = new URLSearchParams();
                if (report.from) params.set('from', report.from);
                if (report.to) params.set('to', report.to);
                if (report.status) params.set('status', report.status);
                if (report.carId) params.set('carId', report.carId);
                params.set('format', report.format);
                window.location.href = `${getApiBase()}/api/reports/bookings?${params.toString()}`;
              }}
            >
              Download
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setReport({ from: '', to: '', format: 'pdf', status: 'all', carId: '' })}
            >
              Reset
            </button>
          </div>
        </div>
        <small style={{ display: 'block', marginTop: '0.75rem', color: 'var(--gray-500)', fontSize: '0.8125rem' }}>
          Tip: Leave dates empty to export all bookings. If you see “Unauthorized”, log in as admin again.
        </small>
      </div>
    </>
  );
}
