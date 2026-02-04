import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, getCarImages } from '../api';
import Calendar from '../components/Calendar';
import ImageCarousel from '../components/ImageCarousel';
import Spinner from '../components/Spinner';

const MESSENGER_URL = 'https://m.me/clars.clixy';
const FACEBOOK_PAGE_URL = 'https://www.facebook.com/clars.clixy';

export default function CarDetails() {
  const { id } = useParams();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiGet(`/cars/${id}`)
      .then(setCar)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <Spinner size="lg" />
        <span>Loading car details...</span>
      </div>
    );
  }
  if (error) return <p className="error">{error}</p>;
  if (!car) return null;

  const suggestedMessage = `Hi, I'd like to book "${car.name}" for my trip. Please confirm availability.`;
  const bookUrl = `${MESSENGER_URL}?text=${encodeURIComponent(suggestedMessage)}`;

  const copyMessage = () => {
    navigator.clipboard.writeText(suggestedMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Cars</Link>
        <span>/</span>
        <span>{car.name}</span>
      </nav>

      <div className="car-details-layout">
        <div className="card" style={{ overflow: 'hidden' }}>
          <ImageCarousel images={getCarImages(car)} alt={car.name} height={320} />
          <div className="card-body car-details-card-body">
            <h1 className="car-details-title">{car.name}</h1>
            {car.description && <p className="car-details-description">{car.description}</p>}
            <div className="car-details-action-row">
              <div className="price-badge">
                <span className="amount">₱{Number(car.pricePerDay).toLocaleString()}</span>
                <span className="unit">per day</span>
              </div>
              <a
                href={bookUrl}
                className="car-details-cta"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span aria-hidden>💬</span> Book via Messenger / Facebook
              </a>
            </div>
            <p className="car-details-message-hint">
              Suggested message (copy if not pre-filled):{' '}
              <button type="button" className="car-details-copy-msg" onClick={copyMessage} title="Copy message">
                {suggestedMessage}
              </button>
              {copied && <span className="car-details-copied"> Copied!</span>}
            </p>
          </div>
        </div>

        <section className="car-details-section">
          <h2 className="section-heading">Availability</h2>
          <p className="section-sub">Check which dates are free. Use the legend below the calendar to understand the symbols.</p>
          <Calendar carId={id} />
        </section>
      </div>
    </>
  );
}
