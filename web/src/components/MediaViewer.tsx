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
  if (!media || media.length === 0) {
    return <div className="empty-state">No media</div>;
  }

  return (
    <div className="media-viewer">
      {media.map((m) => {
        const file = m.file;
        if (!file?.url) return null;

        if (isVideo(file.mime_type)) {
          return (
            <video
              key={m.id}
              className="media-viewer__item media-viewer__item--video"
              controls
              preload="metadata"
              playsInline
            >
              <source src={file.url} type={file.mime_type} />
              Your browser does not support video playback.
            </video>
          );
        }

        if (isImage(file.mime_type)) {
          return (
            <a
              key={m.id}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={file.url}
                alt={m.caption || file.original_name}
                className="media-viewer__item media-viewer__item--image"
                loading="lazy"
              />
            </a>
          );
        }

        return null;
      })}
    </div>
  );
}
