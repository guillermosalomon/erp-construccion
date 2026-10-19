'use client';

export default function CookieSettingsButton() {
  const handleOpenSettings = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kalarti:open-cookie-settings'));
    }
  };

  return (
    <button
      onClick={handleOpenSettings}
      style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: '#0f172a',
        border: 'none',
        padding: '12px 22px',
        borderRadius: '10px',
        fontWeight: 800,
        fontSize: '14px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
      }}
    >
      🍪 Configurar o revocar mis preferencias de Cookies
    </button>
  );
}
