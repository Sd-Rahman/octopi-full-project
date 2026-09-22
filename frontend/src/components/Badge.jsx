export default function Badge({ status }) {
  const norm = String(status || '').toLowerCase();
  return (
    <span className={`badge badge-${norm}`}>
      <span className="badge-dot" />
      {status || 'Unknown'}
    </span>
  );
}

