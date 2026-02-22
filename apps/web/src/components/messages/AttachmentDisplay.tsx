interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType?: string;
}

interface AttachmentDisplayProps {
  attachments: Attachment[];
}

function resolveAttachmentUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  if (rawUrl.startsWith('/')) return rawUrl;

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname;
    const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    if (!isLoopback) return rawUrl;

    const filename = parsed.pathname.split('/').pop();
    if (!filename) return rawUrl;
    return `/api/v1/files/${encodeURIComponent(filename)}`;
  } catch {
    return rawUrl;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentDisplay({ attachments }: AttachmentDisplayProps) {
  if (!attachments.length) return null;

  return (
    <div className="attachment-display">
      {attachments.map((att) => {
        const isImage = att.mimeType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(att.filename);
        const resolvedUrl = resolveAttachmentUrl(att.url);

        if (isImage) {
          return (
            <a key={att.id} href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="attachment-image-link">
              <img src={resolvedUrl} alt={att.filename} className="attachment-image" loading="lazy" />
            </a>
          );
        }

        return (
          <a key={att.id} href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="attachment-file">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <div className="attachment-file-info">
              <span className="attachment-file-name">{att.filename}</span>
              <span className="attachment-file-size">{formatFileSize(att.size)}</span>
            </div>
          </a>
        );
      })}
    </div>
  );
}
