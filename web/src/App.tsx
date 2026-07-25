import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ArtistPage from './pages/ArtistPage';
import PostPage from './pages/PostPage';
import CreateArtistPage from './pages/CreateArtistPage';
import CreatePostPage from './pages/CreatePostPage';
import ManageTagsPage from './pages/ManageTagsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/artists/new" element={<CreateArtistPage />} />
          <Route path="/posts/new" element={<CreatePostPage />} />
          <Route path="/tags" element={<ManageTagsPage />} />
          <Route path="/artist/:slug" element={<ArtistPage />} />
          <Route path="/artist/:slug/post/new" element={<CreatePostPage />} />
          <Route path="/artist/:slug/post/:postId" element={<PostPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

