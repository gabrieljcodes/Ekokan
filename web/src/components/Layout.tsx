import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();

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
          <div style={{ display: 'flex', gap: '8px', marginLeft: '8px', alignItems: 'center' }}>
            {user ? (
              <div className="user-menu">
                <span className="user-menu__name">👤 {user.display_name || user.username}</span>
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
            <Link to="/artists/new" className="app-header__btn app-header__btn--secondary">
              + New Artist
            </Link>
            <Link to="/posts/new" className="app-header__btn app-header__btn--primary">
              📤 Upload Post
            </Link>
          </div>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>Ekokan &mdash; Art Gallery</span>
      </footer>
    </>
  );
}

