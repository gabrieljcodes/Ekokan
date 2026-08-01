import React, { useState, useCallback, useEffect } from 'react';
import { IconCheck, IconTrash, IconX } from './Icons';

interface Props {
  selectedPostCount: number;
  currentPagePostCount: number;
  deletingLoading: boolean;
  deletingStatus: string | null;
  deletingError: string | null;
  onSelectPage: () => void;
  onDeselectPage: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
}

const MassDeletePanel = React.memo(function MassDeletePanel({
  selectedPostCount,
  currentPagePostCount,
  deletingLoading,
  deletingStatus,
  deletingError,
  onSelectPage,
  onDeselectPage,
  onClearSelection,
  onDeleteSelected,
}: Props) {
  const [isConfirming, setIsConfirming] = useState(false);

  // Automatically close confirmation if selection drops to 0
  useEffect(() => {
    if (selectedPostCount === 0 && isConfirming) {
      setIsConfirming(false);
    }
  }, [selectedPostCount, isConfirming]);

  const handleInitialClick = useCallback(() => {
    setIsConfirming(true);
  }, []);

  const handleCancelConfirm = useCallback(() => {
    setIsConfirming(false);
  }, []);

  const handleClear = useCallback(() => {
    setIsConfirming(false);
    onClearSelection();
  }, [onClearSelection]);

  const handleExecuteDelete = useCallback(() => {
    setIsConfirming(false);
    onDeleteSelected();
  }, [onDeleteSelected]);

  return (
    <section
      className="tag-panel"
      role="region"
      aria-label="Batch post deletion control panel"
      aria-busy={deletingLoading}
    >
      <div className="tag-panel__header">
        <div>
          <h2 className="tag-panel__title tag-panel__title--danger">
            <span className="tag-panel__title-icon" aria-hidden={true}><IconTrash size={20} /></span>
            <span>Mass Post Deletion</span>
          </h2>
          <p className="tag-panel__subtitle">
            Click on post cards across pages to select works for permanent deletion. Associated media and attachments will be wiped from storage automatically.
          </p>
        </div>
        <div className="tag-panel__header-actions">
          <span
            className="tag-panel__badge tag-panel__badge--accent"
            aria-live="polite"
          >
            Selected Posts: {selectedPostCount}
          </span>
          <button
            type="button"
            onClick={onSelectPage}
            className="btn-secondary"
            disabled={deletingLoading}
          >
            <IconCheck size={14} aria-hidden={true} />
            <span>Select Page ({currentPagePostCount})</span>
          </button>
          <button
            type="button"
            onClick={onDeselectPage}
            className="btn-secondary"
            disabled={deletingLoading}
          >
            <span>Deselect Page</span>
          </button>
          {selectedPostCount > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="btn-secondary"
              disabled={deletingLoading}
            >
              <IconX size={14} aria-hidden={true} />
              <span>Clear Selection</span>
            </button>
          )}
        </div>
      </div>

      {deletingStatus && (
        <div className="form-success tag-panel__alert" role="status" aria-live="polite">
          <IconCheck size={14} aria-hidden={true} /> <span>{deletingStatus}</span>
        </div>
      )}

      {deletingError && (
        <div className="form-error tag-panel__alert" role="alert" aria-live="assertive">
          <IconX size={14} aria-hidden={true} /> <span>{deletingError}</span>
        </div>
      )}

      <div className="tag-panel__actions tag-panel__actions--bordered">
        {!isConfirming ? (
          <button
            type="button"
            onClick={handleInitialClick}
            disabled={deletingLoading || selectedPostCount === 0}
            className="btn-danger"
          >
            <IconTrash size={16} aria-hidden={true} />
            <span>
              {deletingLoading ? 'Deleting Posts & Media…' : `Delete (${selectedPostCount}) Selected Posts`}
            </span>
          </button>
        ) : (
          <div className="tag-panel__confirm-group">
            <p id="delete-confirm-text" className="tag-panel__confirm-text" role="alert">
              Are you sure? This action cannot be undone.
            </p>
            <button
              type="button"
              onClick={handleExecuteDelete}
              className="btn-danger"
              disabled={deletingLoading}
              aria-describedby="delete-confirm-text"
            >
              <IconTrash size={16} aria-hidden={true} />
              <span>Confirm Permanent Deletion ({selectedPostCount})</span>
            </button>
            <button
              type="button"
              onClick={handleCancelConfirm}
              className="btn-secondary"
              disabled={deletingLoading}
            >
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
});

export default MassDeletePanel;
