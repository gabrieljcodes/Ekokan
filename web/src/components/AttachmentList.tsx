import type { PostAttachment } from '../types/models';

interface Props {
  attachments: PostAttachment[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function AttachmentList({ attachments }: Props) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <ul className="attachment-list">
      {attachments.map((att) => {
        const file = att.file;
        const name = att.display_name || file?.original_name || 'File';
        const url = file?.url;
        const size = file?.file_size;

        return (
          <li key={att.id} className="attachment-item">
            <span className="attachment-item__icon">📎</span>
            {url ? (
              <a
                href={url}
                download={name}
                target="_blank"
                rel="noopener noreferrer"
                className="attachment-item__name"
              >
                {name}
              </a>
            ) : (
              <span className="attachment-item__name">{name}</span>
            )}
            {size != null && (
              <span className="attachment-item__size">{formatSize(size)}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
