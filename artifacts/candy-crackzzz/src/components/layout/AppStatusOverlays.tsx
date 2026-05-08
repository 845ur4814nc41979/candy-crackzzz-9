import { ReactNode } from 'react';

export function FullScreenLoader({ message = 'Loading Candy Crackzzz…' }: { message?: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a0726',
        color: '#fff',
        fontFamily: '"Nunito", system-ui, sans-serif',
        zIndex: 9999,
        padding: '1.5rem',
        textAlign: 'center',
      }}
      data-testid="app-loading"
    >
      <div
        style={{
          width: 56,
          height: 56,
          border: '4px solid rgba(255,255,255,0.15)',
          borderTopColor: '#ff3ea5',
          borderRadius: '50%',
          animation: 'cc-spin 0.9s linear infinite',
        }}
      />
      <p style={{ marginTop: '1rem', fontSize: '1rem', opacity: 0.9 }}>{message}</p>
      <style>{`@keyframes cc-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function FullScreenError({
  title = 'Could not reach app data.',
  detail = 'Using local defaults so you can keep browsing.',
  onRetry,
  children,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a0726',
        color: '#fff',
        fontFamily: '"Nunito", system-ui, sans-serif',
        zIndex: 9999,
        padding: '1.5rem',
        textAlign: 'center',
      }}
      data-testid="app-error"
    >
      <h1 style={{ fontSize: '1.5rem', margin: 0, color: '#ff3ea5' }}>{title}</h1>
      <p style={{ marginTop: '0.75rem', maxWidth: 420, opacity: 0.85 }}>{detail}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1.5rem',
            borderRadius: 999,
            border: 'none',
            background: '#ff3ea5',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '1rem',
          }}
          data-testid="button-retry-bootstrap"
        >
          Retry
        </button>
      )}
      {children}
    </div>
  );
}

export function FallbackBanner({ onRetry }: { onRetry?: () => void }) {
  if (!import.meta.env.DEV) return null;
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 12,
        left: 12,
        right: 12,
        margin: '0 auto',
        maxWidth: 520,
        background: 'rgba(255, 62, 165, 0.95)',
        color: '#fff',
        padding: '0.6rem 0.9rem',
        borderRadius: 10,
        fontSize: '0.8rem',
        fontFamily: '"Nunito", system-ui, sans-serif',
        boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
      }}
      data-testid="dev-fallback-banner"
    >
      <span>Dev: backend unreachable. Showing local defaults.</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            background: 'rgba(0,0,0,0.25)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '0.25rem 0.6rem',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
