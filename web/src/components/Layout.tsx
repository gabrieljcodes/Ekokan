import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <>
      <header className="app-header">
        <Link to="/" className="app-header__logo">Ekokan</Link>
        <nav className="app-header__nav">
          <Link to="/" className="app-header__link">Artists</Link>
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
