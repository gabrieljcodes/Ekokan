import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <>
      <header className="app-header">
        <Link to="/" className="app-header__logo">Ekokan</Link>
        <nav className="app-header__nav">
          <Link to="/" className="app-header__link">Artists</Link>
          <Link to="/tags" className="app-header__link">Tags</Link>
          <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
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
