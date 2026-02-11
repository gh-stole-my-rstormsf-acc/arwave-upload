import type { CostEstimate, FlowState, UploadProgress } from '../types/domain';
import { formatWeiAsEth, humanFileSize } from '../lib/validators';

interface CostPanelProps {
  estimate: CostEstimate | null;
  progress: UploadProgress | null;
  flowState: FlowState;
  canUpload: boolean;
  onUpload: () => void;
}

function renderProgress(progress: UploadProgress | null): string {
  if (!progress) return 'No active upload.';

  if (progress.stage === 'funding') {
    return 'Waiting for funding transaction confirmation...';
  }

  if (progress.stage === 'manifest') {
    return 'Uploading manifest...';
  }

  return `Uploading ${progress.current}/${progress.total}: ${progress.fileName ?? 'file'}`;
}

export function CostPanel(props: CostPanelProps) {
  const { estimate, progress, flowState, canUpload, onUpload } = props;

  const isBusy = ['estimating', 'funding', 'uploading', 'linking'].includes(flowState);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Cost</h2>
        <span className="mono">{estimate ? `${estimate.eth} ETH` : 'n/a'}</span>
      </div>

      {estimate ? (
        <dl className="kv">
          <div>
            <dt>Batch size</dt>
            <dd>{humanFileSize(estimate.totalBytes)}</dd>
          </div>
          <div>
            <dt>Estimate</dt>
            <dd>{formatWeiAsEth(estimate.wei)} ETH</dd>
          </div>
          <div>
            <dt>Funding amount (5% buffer)</dt>
            <dd>{formatWeiAsEth(estimate.bufferedWei)} ETH</dd>
          </div>
        </dl>
      ) : (
        <p className="muted">Cost estimate appears after file selection.</p>
      )}

      <button type="button" disabled={!canUpload || isBusy} onClick={onUpload}>
        {isBusy ? 'Processing...' : 'Pay in ETH and Upload'}
      </button>

      <p className="muted">{renderProgress(progress)}</p>
    </section>
  );
}
