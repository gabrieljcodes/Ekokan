import { useState, useEffect, useRef } from 'react';
import type { PostMedia } from '../types/models';

interface Props {
  media: PostMedia[];
}

function isVideo(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export default function MediaViewer({ media }: Props) {
  const [selectedItem, setSelectedItem] = useState<PostMedia | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragDistanceRef = useRef<number>(0);

  // Reset zoom/pan when opening modal or changing item
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [selectedItem]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedItem) return;
      if (e.key === 'Escape') setSelectedItem(null);
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(5, z + 0.5));
      else if (e.key === '-' || e.key === '_') setZoom((z) => {
        const next = Math.max(0.5, z - 0.5);
        if (next <= 1) setPan({ x: 0, y: 0 });
        return next;
      });
      else if (e.key === '0') { setZoom(1); setPan({ x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem]);

  if (!media || media.length === 0) {
    return <div className="empty-state">No media</div>;
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoom((prev) => {
      const next = Math.min(5, Math.max(0.5, prev + delta));
      if (next <= 1) {
        setPan({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragDistanceRef.current = 0;
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      dragDistanceRef.current += Math.abs(newX - pan.x) + Math.abs(newY - pan.y);
      setPan({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // If the user didn't drag around, interpret as click to toggle zoom
    if (dragDistanceRef.current < 10) {
      if (zoom === 1) {
        setZoom(2.2);
      } else {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    }
  };

  const adjustZoom = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((prev) => {
      const next = Math.min(5, Math.max(0.5, Number((prev + delta).toFixed(2))));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  return (
    <>
      <div className="media-viewer">
        {media.map((m) => {
          const file = m.file;
          if (!file?.url) return null;

          if (isVideo(file.mime_type)) {
            return (
              <div key={m.id} className="media-viewer__wrapper media-viewer__wrapper--video">
                <video
                  className="media-viewer__item media-viewer__item--video"
                  controls
                  preload="metadata"
                  playsInline
                  poster={file.thumbnail_url || file.url}
                >
                  <source src={file.url} type={file.mime_type} />
                  Your browser does not support video playback.
                </video>
                {m.caption && <div className="media-viewer__caption">{m.caption}</div>}
              </div>
            );
          }

          if (isImage(file.mime_type)) {
            return (
              <div
                key={m.id}
                className="media-viewer__wrapper media-viewer__wrapper--image"
                onClick={() => setSelectedItem(m)}
                title="Click to expand & zoom"
              >
                <img
                  src={file.url}
                  alt={m.caption || file.original_name}
                  className="media-viewer__item media-viewer__item--image"
                  loading="lazy"
                />
                <div className="media-viewer__zoom-overlay">
                  <span className="media-viewer__zoom-badge">🔍 Click to Zoom</span>
                </div>
                {m.caption && <div className="media-viewer__caption">{m.caption}</div>}
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Lightbox Modal */}
      {selectedItem && selectedItem.file?.url && (
        <div
          className="lightbox-backdrop"
          onClick={() => setSelectedItem(null)}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Main Workspace */}
          <div className="lightbox-viewport">
            <img
              src={selectedItem.file.url}
              alt={selectedItem.caption || selectedItem.file.original_name}
              className="lightbox-image"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
              onMouseDown={handleMouseDown}
              onClick={handleImageClick}
              draggable={false}
            />
          </div>

          {/* Top Info Header */}
          <div className="lightbox-header" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header__title">
              {selectedItem.caption || selectedItem.file.original_name}
            </div>
            <button
              type="button"
              className="lightbox-btn lightbox-btn--close"
              onClick={() => setSelectedItem(null)}
              title="Close (ESC)"
            >
              ✕
            </button>
          </div>

          {/* Floating Controls Bar */}
          <div className="lightbox-controls" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-btn"
              onClick={(e) => adjustZoom(-0.25, e)}
              disabled={zoom <= 0.5}
              title="Zoom Out (-)"
            >
              ➖
            </button>

            <span className="lightbox-zoom-level" onClick={(e) => { e.stopPropagation(); setZoom(1); setPan({ x: 0, y: 0 }); }} title="Click to reset 100%">
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              className="lightbox-btn"
              onClick={(e) => adjustZoom(0.25, e)}
              disabled={zoom >= 5}
              title="Zoom In (+)"
            >
              ➕
            </button>

            <div className="lightbox-divider" />

            <button
              type="button"
              className="lightbox-btn lightbox-btn--reset"
              onClick={(e) => { e.stopPropagation(); setZoom(1); setPan({ x: 0, y: 0 }); }}
              title="Reset Zoom & Position"
            >
              🔄 Reset
            </button>

            <a
              href={selectedItem.file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="lightbox-btn lightbox-btn--link"
              onClick={(e) => e.stopPropagation()}
              title="Open Original Image in New Tab"
            >
              📥 Original
            </a>
          </div>
        </div>
      )}
    </>
  );
}
