export default function EmptyState({ icon = '📭', title = 'Nothing here yet', description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <p>{title}</p>
      {description && <small>{description}</small>}
      {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
    </div>
  );
}
