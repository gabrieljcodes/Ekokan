import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, settings, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.role === 'administrator';
  const canCreateArtist = isAdmin || (settings?.allow_user_artist_creation !== false);
  const canCreatePost = isAdmin || (settings?.allow_user_post_creation !== false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <header className="app-header">
        <Link to="/" className="app-header__logo">Ekokan</Link>
        <nav className="app-header__nav">
          <Link to="/" className="app-header__link">Artists</Link>
          <Link to="/tags" className="app-header__link">Tags</Link>
          {user && (
            <Link to="/favorites" className="app-header__link" style={{ color: '#ff4081', fontWeight: 600 }}>
              ⭐ Favorites
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin/settings" className="app-header__link" style={{ color: '#646cff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              ⚡ Admin Settings
            </Link>
          )}

          <div style={{ display: 'flex', gap: '8px', marginLeft: '8px', alignItems: 'center' }}>
            {user ? (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <div
                  className="user-menu"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  {user.avatar_url && (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', background: 'var(--bg-card)' }}
                    />
                  )}
                  <span className="user-menu__name">
                    {!user.avatar_url && (isAdmin ? '⚡ ' : '👤 ')}
                    {user.display_name || user.username}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px' }}>▼</span>
                </div>

                {dropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '210px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                    padding: 'var(--space-xs) 0',
                    zIndex: 200
                  }}>
                    <Link
                      to="/profile?tab=profile"
                      style={{ display: 'block', padding: '8px 14px', fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', textDecoration: 'none' }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Profile & Avatar
                    </Link>
                    <Link
                      to="/profile?tab=tags"
                      style={{ display: 'block', padding: '8px 14px', fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', textDecoration: 'none' }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Tag Filters (Excluded)
                    </Link>
                    <Link
                      to="/profile?tab=tokens"
                      style={{ display: 'block', padding: '8px 14px', fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', textDecoration: 'none' }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      API Tokens & Keys
                    </Link>

                    <div style={{ borderTop: '1px solid var(--border-light)', margin: '4px 0' }} />

                    <button
                      onClick={handleLogout}
                      className="user-menu__logout"
                      style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 'var(--fs-sm)', display: 'block', color: 'var(--danger)' }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="app-header__btn app-header__btn--secondary">
                  Login
                </Link>
                <Link to="/register" className="app-header__btn app-header__btn--primary" style={{ borderColor: 'var(--accent)' }}>
                  Register
                </Link>
              </>
            )}
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }} />

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {canCreateArtist && (
              <Link to="/artists/new" className="app-header__btn app-header__btn--secondary">
                + New Artist
              </Link>
            )}
            {canCreatePost && (
              <Link to="/posts/new" className="app-header__btn app-header__btn--primary">
                + New Post
              </Link>
            )}
          </div>
        </nav>
      </header>
      <main className="app-container">
        <Outlet />
      </main>
      <footer className="app-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px' }}>
        <span>Ekokan &mdash; Art Gallery</span>
        <a href="/docs" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          Interactive API Documentation (Scalar / OpenAPI 3.0) ↗
        </a>
      </footer>
    </>
  );
}
