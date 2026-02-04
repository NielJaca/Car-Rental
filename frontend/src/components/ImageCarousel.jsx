import { useState, useEffect } from 'react';
import { getImageUrl } from '../api';

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='280'%3E%3Crect fill='%23e5e7eb' width='400' height='280'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236b7280' font-size='16'%3ENo image%3C/text%3E%3C/svg%3E";

export default function ImageCarousel({ images, alt = '', height = 320, className = '' }) {
  const urls = Array.isArray(images) ? images.filter(Boolean) : [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [images]);

  if (!urls.length) {
    return (
      <div className={`image-carousel image-carousel--single ${className}`} style={{ height }}>
        <img src={PLACEHOLDER} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  const src = getImageUrl(urls[index]) || PLACEHOLDER;
  const prev = () => setIndex((i) => (i - 1 + urls.length) % urls.length);
  const next = () => setIndex((i) => (i + 1) % urls.length);

  return (
    <div className={`image-carousel ${urls.length > 1 ? 'image-carousel--many' : 'image-carousel--single'} ${className}`} style={{ height }}>
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={(e) => { e.target.src = PLACEHOLDER; }}
      />
      {urls.length > 1 && (
        <>
          <button type="button" className="image-carousel-btn image-carousel-btn--prev" onClick={prev} aria-label="Previous image">‹</button>
          <button type="button" className="image-carousel-btn image-carousel-btn--next" onClick={next} aria-label="Next image">›</button>
          <div className="image-carousel-dots" aria-hidden="true">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`image-carousel-dot ${i === index ? 'active' : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
