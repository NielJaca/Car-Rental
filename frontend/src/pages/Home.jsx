import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, getImageUrl, getCarImages } from '../api';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='120'%3E%3Crect fill='%23e5e7eb' width='200' height='120'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236b7280' font-size='14'%3ECar%3C/text%3E%3C/svg%3E";

export default function Home() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiGet('/cars')
      .then(setCars)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredCars = useMemo(() => {
    if (!search.trim()) return cars;
    const q = search.trim().toLowerCase();
    return cars.filter((c) => c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q)));
  }, [cars, search]);

  if (loading) {
    return (
      <div className="loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <Spinner size="lg" />
        <span>Loading cars...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="card card-body error-card" style={{ maxWidth: 480 }}>
        <p className="error" style={{ margin: 0, fontWeight: 500 }}>{error}</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-500)' }}>Check that the backend is running on port 3000.</p>
      </div>
    );
  }

  return (
    <>
      <section className="hero">
        <h1>Lovely&apos;s Car Rental</h1>
        <p>Choose a car, check availability, and book it!</p>
      </section>

      <div className="section-toolbar" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 className="page-title" style={{ marginBottom: '0.25rem' }}>Our Cars</h2>
          <p className="page-sub" style={{ margin: 0 }}>Browse and check availability</p>
        </div>
        {cars.length > 0 && (
          <div className="search-wrap">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="search"
              className="form-control"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search cars"
            />
          </div>
        )}
      </div>

      {cars.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🚗"
            title="No cars available"
            description="Cars will appear here once added by the admin."
          />
        </div>
      ) : filteredCars.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🔍"
            title="No matches"
            description={`No cars match "${search}". Try a different search.`}
            action={<button type="button" className="btn btn-secondary" onClick={() => setSearch('')}>Clear search</button>}
          />
        </div>
      ) : (
        <div className="grid-2">
          {filteredCars.map((car) => (
            <Link
              key={car._id}
              to={`/car/${car._id}`}
              className="card car-card"
            >
              <img
                src={getImageUrl(getCarImages(car)[0]) || PLACEHOLDER}
                alt={car.name}
                onError={(e) => { e.target.src = PLACEHOLDER; }}
              />
              <div className="card-body-inner">
                <h3>{car.name}</h3>
                <p className="price" style={{ margin: 0 }}>
                  ₱{Number(car.pricePerDay).toLocaleString()} <span style={{ fontWeight: 400, color: 'var(--gray-500)', fontSize: '0.875rem' }}>/ day</span>
                </p>
                <span className="card-cta">View details <span aria-hidden>→</span></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
