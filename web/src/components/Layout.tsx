import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, settings, logout } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'administrator';
  const canCreateArtist = isAdmin || (settings?.allow_user_artist_creation !== false);
  const canCreatePost = isAdmin || (settings?.allow_user_post_creation !== false);

  return (
    <>
      <header className="app-header">
        <Link to="/" className="app-header__logo">Ekokan</Link>
        <nav className="app-header__nav">
          <Link to="/" className="app-header__link">Artists</Link>
          <Link to="/tags" className="app-header__link">Tags</Link>
          {user && (
            <>
              <Link to="/favorites" className="app-header__link" style={{ color: '#ff4081', fontWeight: 600 }}>
                ⭐ Favorites
              </Link>
              <Link to="/tokens" className="app-header__link" style={{ color: '#10b981', fontWeight: 600 }}>
                🔑 API Tokens
              </Link>
            </>
          )}
          {isAdmin && (
            <Link to="/admin/settings" className="app-header__link" style={{ color: '#646cff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              ⚡ Admin Settings
            </Link>
          )}
          <div style={{ display: 'flex', gap: '8px', marginLeft: '8px', alignItems: 'center' }}>
            {user ? (
              <div className="user-menu">
                <span className="user-menu__name">
                  {isAdmin ? '⚡ ' : '👤 '}{user.display_name || user.username}
                </span>
                <button onClick={logout} className="user-menu__logout" title="Log out of session">
                  Logout
                </button>
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
            <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }} />
            {canCreateArtist && (
              <Link to="/artists/new" className="app-header__btn app-header__btn--secondary">
                + New Artist
              </Link>
            )}
            {canCreatePost && (
              <Link to="/posts/new" className="app-header__btn app-header__btn--primary">
                📤 Upload Post
              </Link>
            )}
          </div>
        </nav>
      </header>
      <main>
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

