import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, settings, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin' || user?.role === 'administrator';
  const canCreateArtist = isAdmin || (settings?.allow_user_artist_creation !== false);
  const canCreatePost = isAdmin || (settings?.allow_user_post_creation !== false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on navigation or outside click
  useEffect(() => {
    setDropdownOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="app-header" style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)', background: 'rgba(15, 23, 42, 0.85)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Link to="/" className="app-header__logo" style={{ background: 'linear-gradient(135deg, #fff, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.5px' }}>
          Ekokan
        </Link>

        <nav className="app-header__nav" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/" className="app-header__link" style={{ fontWeight: 600 }}>Artists</Link>
          <Link to="/tags" className="app-header__link" style={{ fontWeight: 600 }}>Tags</Link>
          {user && (
            <Link to="/favorites" className="app-header__link" style={{ color: '#ff4081', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              ⭐ Favorites
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin/settings" className="app-header__link" style={{ color: '#6366f1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              ⚡ Admin Settings
            </Link>
          )}

          <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />

          {/* User Section / Profile Dropdown */}
          {user ? (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: dropdownOpen ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '5px 12px 5px 6px',
                  borderRadius: '999px',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--accent))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                      {(user.display_name || user.username).charAt(0)}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                  {user.display_name || user.username}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}>
                  ▼
                </span>
              </button>

              {/* Glassmorphic Dropdown Menu */}
              {dropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  width: '270px',
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98))',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0,0,0,0.3)',
                  padding: '8px',
                  zIndex: 200,
                  backdropFilter: 'blur(16px)',
                  animation: 'fadeIn 0.15s ease-out'
                }}>
                  {/* User info mini header */}
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '6px' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>
                      {user.display_name || user.username}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '3px' }}>
                      <span>@{user.username}</span>
                      <span style={{ background: isAdmin ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.1)', padding: '1px 8px', borderRadius: '999px', fontSize: '10px', color: '#fff', fontWeight: 700 }}>
                        {user.role}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <Link
                      to="/profile?tab=profile"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', color: 'var(--text)', textDecoration: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 500, transition: 'background 0.15s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: '16px' }}>👤</span>
                      <div>
                        <div>Profile & Avatar</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Customize appearance</div>
                      </div>
                    </Link>

                    <Link
                      to="/profile?tab=tags"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', color: 'var(--text)', textDecoration: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 500, transition: 'background 0.15s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: '16px' }}>🚫</span>
                      <div>
                        <div style={{ color: '#fca5a5' }}>Excluded Tags Filter</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Não ver X tags persistently</div>
                      </div>
                    </Link>

                    <Link
                      to="/profile?tab=tokens"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', color: 'var(--text)', textDecoration: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 500, transition: 'background 0.15s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: '16px' }}>🔑</span>
                      <div>
                        <div style={{ color: '#34d399' }}>API Tokens & Keys</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Manage automation credentials</div>
                      </div>
                    </Link>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '6px 0', padding: '2px 0' }}>
                    <button
                      onClick={logout}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        textAlign: 'left',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span>🚪</span>
                      <span>Log Out of Ekokan</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Link to="/login" className="app-header__btn app-header__btn--secondary" style={{ padding: '8px 16px', borderRadius: '10px' }}>
                Login
              </Link>
              <Link to="/register" className="app-header__btn app-header__btn--primary" style={{ borderColor: 'var(--accent)', padding: '8px 16px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                Register
              </Link>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginLeft: '4px', alignItems: 'center' }}>
            {canCreateArtist && (
              <Link to="/artists/new" className="app-header__btn app-header__btn--secondary" style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.15)' }}>
                + New Artist
              </Link>
            )}
            {canCreatePost && (
              <Link to="/posts/new" className="app-header__btn app-header__btn--primary" style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '13px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}>
                📤 Upload Post
              </Link>
            )}
          </div>
        </nav>
      </header>
      <main style={{ minHeight: 'calc(100vh - 140px)' }}>
        <Outlet />
      </main>
      <footer className="app-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 32px', background: 'rgba(15, 23, 42, 0.5)', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
        <span style={{ color: 'var(--text-muted)' }}>Ekokan &mdash; Modern Art Collector & Repository</span>
        <a href="/docs" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
          OpenAPI 3.0 Documentation ↗
        </a>
      </footer>
    </>
  );
}
