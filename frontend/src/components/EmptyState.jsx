export default function EmptyState({ icon = '📂', title, description, actionText, onAction }) {
  return (
    <div className="empty-state-container">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {actionText && onAction && (
        <button type="button" className="btn-primary empty-state-btn" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
}
