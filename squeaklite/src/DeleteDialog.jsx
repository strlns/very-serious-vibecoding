import React from "react";
import { Button, Modal, Badge } from "./ui.jsx";
export default function DeleteDialog({
  plan,
  error,
  busy,
  onClose,
  onConfirm,
  onReview,
  onOpenRelated,
}) {
  return (
    <Modal
      title={
        plan.blocked
          ? "Deletion blocked"
          : `Delete ${plan.count} row${plan.count === 1 ? "" : "s"}?`
      }
      subtitle={`${plan.table} · ${plan.databasePath}`}
      onClose={onClose}
      dismissible={!busy}
    >
      <div className="delete-review">
        <p>
          {plan.blocked
            ? "Other rows still reference this selection. Resolve those references before deleting."
            : "This deletes the reviewed selection from the in-memory database. SQLite triggers and cascade rules also apply."}
        </p>
        {!plan.foreignKeysEnabled && (
          <div className="error-banner">
            Foreign-key enforcement is currently disabled in this database.
            Related rows may be left without a parent.
          </div>
        )}
        {plan.related.length > 0 && (
          <>
            <h3>Referencing rows</h3>
            <div className="delete-dependencies">
              {plan.related.map((r, i) => (
                <div key={i}>
                  <div>
                    <strong>{r.table}</strong>
                    <span>
                      {r.count.toLocaleString()} rows · {r.columns.join(", ")}
                    </span>
                  </div>
                  <Badge color={r.blocked ? "amber" : "green"}>
                    {r.blocked ? "Blocks deletion" : r.action}
                  </Badge>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => onOpenRelated(r.table)}
                  >
                    Open table ↗
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        {plan.blocked && (
          <p className="delete-blocked-note">
            Nothing has been deleted. Your selection is preserved.
          </p>
        )}
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
      </div>
      <footer className="modal-footer">
        <Button disabled={busy} onClick={onClose}>
          {plan.blocked ? "Close" : "Cancel"}
        </Button>
        {!plan.blocked &&
          (error ? (
            <Button disabled={busy} onClick={onReview}>
              Review again
            </Button>
          ) : (
            <Button variant="danger" disabled={busy} onClick={onConfirm}>
              Confirm deletion
            </Button>
          ))}
      </footer>
    </Modal>
  );
}
