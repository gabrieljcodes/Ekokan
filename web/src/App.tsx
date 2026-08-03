import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ArtistPage from './pages/ArtistPage';
import PostPage from './pages/PostPage';
import CreateArtistPage from './pages/CreateArtistPage';
import EditArtistPage from './pages/EditArtistPage';
import CreatePostPage from './pages/CreatePostPage';
import EditPostPage from './pages/EditPostPage';
import ManageTagsPage from './pages/ManageTagsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FavoritesPage from './pages/FavoritesPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import ApiTokensPage from './pages/ApiTokensPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import UserProfilePage from './pages/UserProfilePage';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/user/:username" element={<UserProfilePage />} />
            <Route path="/profile" element={<ProfileSettingsPage />} />
            <Route path="/tokens" element={<ApiTokensPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/artists/new" element={<CreateArtistPage />} />
            <Route path="/posts/new" element={<CreatePostPage />} />
            <Route path="/posts/:postId/edit" element={<EditPostPage />} />
            <Route path="/tags" element={<ManageTagsPage />} />
            <Route path="/artist/:slug" element={<ArtistPage />} />
            <Route path="/artist/:slug/edit" element={<EditArtistPage />} />
            <Route path="/artist/:slug/post/new" element={<CreatePostPage />} />
            <Route path="/artist/:slug/post/:postId" element={<PostPage />} />
            <Route path="/artist/:slug/post/:postId/edit" element={<EditPostPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;


