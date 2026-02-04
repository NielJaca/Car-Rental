import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';
import { confirm, showError } from '../../lib/swal';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

function computeDaysAndPrice(startDate, endDate, pricePerDay) {
  if (!startDate || !endDate) return { days: 0, totalPrice: null };
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return { days: 0, totalPrice: null };
  const diffMs = end - start;
  const days = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)) + 1);
  const totalPrice = pricePerDay != null ? days * Number(pricePerDay) : null;
  return { days, totalPrice };
}

function getDisplayTotal(booking) {
  if (booking.totalPrice != null && booking.totalPrice !== '') return Number(booking.totalPrice);
  const pricePerDay = booking.carId?.pricePerDay;
  if (pricePerDay == null) return null;
  const start = booking.startDate ? new Date(booking.startDate) : null;
  const end = booking.endDate ? new Date(booking.endDate) : null;
  if (!start || !end || end < start) return null;
  const diffMs = end - start;
  const days = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)) + 1);
  return days * Number(pricePerDay);
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [originalDates, setOriginalDates] = useState({ startDate: '', endDate: '' });
  const [form, setForm] = useState({ carId: '', customerName: '', contact: '', startDate: '', endDate: '', status: 'pending' });
  const [filters, setFilters] = useState({ status: 'all', from: '', to: '' });
  const [error, setError] = useState(null);

  const loadBookings = () => apiGet('/bookings').then(setBookings).catch((e) => setError(e.message));
  const loadCars = () => apiGet('/cars').then(setCars).catch(() => {});

  useEffect(() => {
    loadBookings();
    loadCars();
    setLoading(false);
  }, []);

  const close = () => { setModal(false); setEditingId(null); setOriginalDates({ startDate: '', endDate: '' }); };

  const openAdd = () => {
    setForm({ carId: '', customerName: '', contact: '', startDate: '', endDate: '', status: 'pending' });
    setEditingId(null);
    setModal(true);
  };

  const openEdit = (b) => {
    const start = b.startDate ? new Date(b.startDate).toISOString().slice(0, 10) : '';
    const end = b.endDate ? new Date(b.endDate).toISOString().slice(0, 10) : '';
    setForm({
      carId: b.carId?._id ?? b.carId ?? '',
      customerName: b.customerName ?? '',
      contact: b.contact ?? '',
      startDate: start,
      endDate: end,
      status: b.status ?? 'pending',
    });
    setEditingId(b._id);
    setOriginalDates({ startDate: start, endDate: end });
    setModal(true);
  };

  const remove = (id) => {
    confirm({
      title: 'Delete booking?',
      text: 'Permanently delete this booking? This cannot be undone.',
      icon: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    }).then((ok) => {
      if (!ok) return;
      apiDelete(`/bookings/${id}`).then(() => loadBookings()).catch((err) => showError(err.message));
    });
  };

  const selectedCar = cars.find((c) => c._id === form.carId);
  const { days, totalPrice } = useMemo(
    () => computeDaysAndPrice(form.startDate, form.endDate, selectedCar?.pricePerDay),
    [form.startDate, form.endDate, selectedCar?.pricePerDay]
  );

  const [availabilityChecking, setAvailabilityChecking] = useState(false);
  const [dateConflict, setDateConflict] = useState(false);

  useEffect(() => {
    if (!form.carId || !form.startDate || !form.endDate) {
      setDateConflict(false);
      return;
    }
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (end < start) {
      setDateConflict(false);
      return;
    }
    setAvailabilityChecking(true);
    const params = new URLSearchParams({
      carId: form.carId,
      startDate: form.startDate,
      endDate: form.endDate,
    });
    if (editingId) {
      params.set('excludeBookingId', editingId);
      if (originalDates.startDate && originalDates.endDate) {
        params.set('currentStartDate', originalDates.startDate);
        params.set('currentEndDate', originalDates.endDate);
      }
    }
    apiGet(`/availability/check?${params}`)
      .then((res) => setDateConflict(!res.available))
      .catch(() => setDateConflict(false))
      .finally(() => setAvailabilityChecking(false));
  }, [form.carId, form.startDate, form.endDate, editingId, originalDates.startDate, originalDates.endDate]);

  const canSave = !dateConflict && !availabilityChecking;
  const conflictMessage = 'One or more dates in this range are already booked or unavailable for this car. Choose different dates to save.';

  const filteredBookings = useMemo(() => {
    const status = filters.status;
    const from = filters.from ? new Date(filters.from) : null;
    const to = filters.to ? new Date(filters.to) : null;
    if (from) from.setUTCHours(0, 0, 0, 0);
    if (to) to.setUTCHours(23, 59, 59, 999);

    return bookings.filter((b) => {
      if (status !== 'all' && b.status !== status) return false;
      if (!from && !to) return true;
      const start = b.startDate ? new Date(b.startDate) : null;
      const end = b.endDate ? new Date(b.endDate) : null;
      if (!start || !end) return false;
      // overlap test between booking range and filter range
      if (from && end < from) return false;
      if (to && start > to) return false;
      return true;
    });
  }, [bookings, filters.from, filters.status, filters.to]);

  const submit = (e) => {
    e.preventDefault();
    const { carId, customerName, contact, startDate, endDate, status } = form;
    if (!carId || !customerName?.trim()) {
      showError('Please select a car and enter customer name.');
      return;
    }
    if (!startDate || !endDate) {
      showError('Start date and end date are required.');
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      showError('End date must be on or after start date.');
      return;
    }
    if (!canSave) {
      showError(conflictMessage);
      return;
    }
    const payload = { customerName, contact, startDate, endDate, totalPrice: totalPrice ?? undefined, status };
    if (editingId) {
      apiPut(`/bookings/${editingId}`, payload)
        .then(() => { close(); loadBookings(); })
        .catch((err) => showError(err.message));
    } else {
      apiPost('/bookings', { carId, ...payload })
        .then(() => { close(); loadBookings(); })
        .catch((err) => showError(err.message));
    }
  };

  if (loading) {
    return (
      <div className="loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <Spinner size="lg" />
        <span>Loading bookings...</span>
      </div>
    );
  }
  if (error) return <p className="error">{error}</p>;

  return (
    <>
      <h1>Manual Bookings</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>Add bookings confirmed via Messenger or Facebook.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <button type="button" className="btn btn-primary" onClick={openAdd}>+ Add Booking</button>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0, minWidth: 180 }}>
            <label>Status</label>
            <select
              className="form-control"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>From</label>
            <input
              type="date"
              className="form-control"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>To</label>
            <input
              type="date"
              className="form-control"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setFilters({ status: 'all', from: '', to: '' })}
            disabled={filters.status === 'all' && !filters.from && !filters.to}
          >
            Clear
          </button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <EmptyState icon="📅" title="No bookings yet" description="Add a manual booking when a customer confirms via Messenger." action={<button type="button" className="btn btn-primary" onClick={openAdd}>Add Booking</button>} />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <EmptyState
            icon="🔎"
            title="No results"
            description="No bookings match the selected filters."
            action={<button type="button" className="btn btn-secondary" onClick={() => setFilters({ status: 'all', from: '', to: '' })}>Clear filters</button>}
          />
        </div>
      ) : (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
            <thead>
              <tr>
                <th>Car</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Start</th>
                <th>End</th>
                <th style={{ minWidth: '5rem' }}>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => {
                const displayTotal = getDisplayTotal(b);
                return (
                  <tr key={b._id}>
                    <td>{b.carId?.name ?? '-'}</td>
                    <td>{b.customerName}</td>
                    <td>{b.contact || '-'}</td>
                    <td>{new Date(b.startDate).toLocaleDateString()}</td>
                    <td>{new Date(b.endDate).toLocaleDateString()}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{displayTotal != null ? `₱${Number(displayTotal).toLocaleString()}` : '-'}</td>
                    <td><span style={{ textTransform: 'capitalize' }}>{b.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(b)}>Edit</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(b._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="card card-body" style={{ maxWidth: 480, width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{editingId ? 'Edit Booking' : 'Add Booking'}</h2>
            <form onSubmit={submit}>
              <div className="form-group">
                <label>Car</label>
                <select className="form-control" value={form.carId} onChange={(e) => setForm((f) => ({ ...f, carId: e.target.value }))} required disabled={!!editingId}>
                  <option value="">Select car</option>
                  {cars.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                {editingId && <small style={{ color: 'var(--gray-500)', fontSize: '0.8125rem' }}>Car cannot be changed when editing.</small>}
              </div>
              <div className="form-group">
                <label>Customer Name</label>
                <input type="text" className="form-control" value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Contact (Messenger / Phone)</label>
                <input type="text" className="form-control" placeholder="e.g. m.me/username" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" className="form-control" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" className="form-control" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} required />
              </div>
              {(days > 0 || totalPrice != null) && (
                <div className="form-group booking-price-summary">
                  <label>Computed price</label>
                  <div className="booking-price-display">
                    {days > 0 && (
                      <span>{days} day{days !== 1 ? 's' : ''}</span>
                    )}
                    {selectedCar?.pricePerDay != null && (
                      <span>₱{Number(selectedCar.pricePerDay).toLocaleString()} × {days} day{days !== 1 ? 's' : ''}</span>
                    )}
                    {totalPrice != null && (
                      <strong className="booking-total">Total: ₱{totalPrice.toLocaleString()}</strong>
                    )}
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>Status</label>
                <select className="form-control" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </div>
              {dateConflict && (
                <div className="form-group" style={{ padding: '0.75rem', background: 'var(--warning-light)', border: '1px solid var(--warning)', borderRadius: 'var(--radius)', marginBottom: '0.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--gray-800)', fontWeight: 500 }}>{conflictMessage}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={!canSave} title={!canSave ? conflictMessage : undefined}>Save</button>
                <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
