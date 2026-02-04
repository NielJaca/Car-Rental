export default function Spinner({ size = 'md', className = '' }) {
  const sizeClass = size === 'sm' ? '1.25rem' : size === 'lg' ? '2.5rem' : '2rem';
  return (
    <div
      className={`spinner ${className}`}
      style={{ width: sizeClass, height: sizeClass }}
      role="status"
      aria-label="Loading"
    />
  );
}
