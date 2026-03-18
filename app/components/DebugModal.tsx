import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import type {SearchResultItem} from "#/types";

type DebugModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SearchResultItem | null;
};

function StatusBadge({value}: {value: boolean | null}) {
  if (value) {
    return (
      <span className="status-badge status-badge-yellow">
        <span className="status-circle" />
        Yes
      </span>
    );
  }
  return (
    <span className="status-badge status-badge-gray">
      <span className="status-dot" />
      No
    </span>
  );
}

function ConfidenceBadge({value}: {value: number}) {
  const percentage = Math.round(value * 100);
  return (
    <span
      className={`status-badge ${value >= 0.7 ? "status-badge-green" : value >= 0.4 ? "status-badge-yellow" : "status-badge-gray"}`}
    >
      <span
        className={
          value >= 0.7
            ? "status-dot"
            : value >= 0.4
              ? "status-circle"
              : "status-dot"
        }
      />
      {percentage}%
    </span>
  );
}

export function DebugModal({open, onOpenChange, item}: DebugModalProps) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Debug Details</DialogTitle>
          <DialogDescription>
            Classification details for @{item.creator.handle}
          </DialogDescription>
        </DialogHeader>

        <div style={{marginTop: "8px"}}>
          <div className="debug-modal-row">
            <span className="debug-modal-label">Confidence</span>
            <div className="debug-modal-value">
              <ConfidenceBadge value={item.confidence} />
            </div>
          </div>

          <div className="debug-modal-row">
            <span className="debug-modal-label">Is Ad</span>
            <div className="debug-modal-value">
              <StatusBadge value={item.isAd} />
            </div>
          </div>

          <div className="debug-modal-row">
            <span className="debug-modal-label">Is Sponsored</span>
            <div className="debug-modal-value">
              <StatusBadge value={item.isSponsored} />
            </div>
          </div>

          <div className="debug-modal-row">
            <span className="debug-modal-label">Signals</span>
            <div className="debug-modal-value">
              {item.signals.length === 0 ? (
                <span className="empty-cell">—</span>
              ) : (
                <div className="debug-modal-signals">
                  {item.signals.map((signal, i) => (
                    <span key={i} className="debug-modal-signal">
                      {signal}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {item.brand && (
            <div className="debug-modal-row">
              <span className="debug-modal-label">Brand</span>
              <div className="debug-modal-value">{item.brand}</div>
            </div>
          )}

          <div className="debug-modal-row">
            <span className="debug-modal-label">Is Promotion</span>
            <div className="debug-modal-value">
              <StatusBadge value={item.isPromotion} />
            </div>
          </div>

          <div className="debug-modal-row">
            <span className="debug-modal-label">Tier</span>
            <div className="debug-modal-value">
              <span
                className={`status-badge ${item.tier === 1 ? "status-badge-green" : "status-badge-gray"}`}
              >
                <span className="status-dot" />
                Tier {item.tier}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
