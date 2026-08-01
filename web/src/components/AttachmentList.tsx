import React from 'react';
import type { PostAttachment } from '../types/models';
import { IconPackage, IconDownload, IconWarning } from './Icons';

interface Props {
  attachments: PostAttachment[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const AttachmentList: React.FC<Props> = React.memo(({ attachments }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <section aria-label="Downloadable post attachments">
      <ul className="attachment-list" role="list">
        {attachments.map((att) => {
          const file = att.file;
          const name = att.display_name || file?.original_name || 'Archive Attachment';
          const url = file?.url;
          const size = file?.file_size;
          const formattedSize = size != null ? formatSize(size) : 'unknown size';

          return (
            <li
              key={att.id}
              className={`attachment-item motion-arrive-row ${!url ? 'attachment-item--disabled' : ''}`}
            >
              <div className="attachment-item__left">
                <span className="attachment-item__icon" aria-hidden={true}>
                  <IconPackage size={20} />
                </span>
                {url ? (
                  <a
                    href={url}
                    download={name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="attachment-item__name"
                    aria-label={`Download file ${name} (${formattedSize})`}
                  >
                    {name}
                  </a>
                ) : (
                  <span className="attachment-item__name" aria-label={`Unavailable attachment ${name}`}>
                    {name} (Offline)
                  </span>
                )}
              </div>

              <div className="attachment-item__right">
                {size != null && (
                  <span className="attachment-item__size" aria-label={`File size: ${formattedSize}`}>
                    {formattedSize}
                  </span>
                )}
                {url ? (
                  <a
                    href={url}
                    download={name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="attachment-item__download-btn"
                    aria-label={`Download ${name} now (${formattedSize})`}
                  >
                    <IconDownload size={16} aria-hidden={true} />
                    <span>Download</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="attachment-item__download-btn"
                    aria-label="Download currently unavailable"
                  >
                    <IconWarning size={16} aria-hidden={true} />
                    <span>Unavailable</span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
});

export default AttachmentList;
