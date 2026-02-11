import type { EnsLinkResult, SupportedNetwork, UploadBatchResult } from '../types/domain';

interface ResultPanelProps {
  uploadResult: UploadBatchResult | null;
  ensResult: EnsLinkResult | null;
  network: SupportedNetwork;
}

function gatewayUrl(txId: string): string {
  return `https://gateway.irys.xyz/${txId}`;
}

export function ResultPanel(props: ResultPanelProps) {
  const { uploadResult, ensResult, network } = props;

  if (!uploadResult) {
    return (
      <section className="panel">
        <div className="panel-head">
          <h2>Results</h2>
        </div>
        <p className="muted">Upload results appear here.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Results</h2>
        <span className="mono">{uploadResult.fileTxIds.length} files</span>
      </div>

      <dl className="kv">
        <div>
          <dt>Manifest TX ID</dt>
          <dd className="mono">{uploadResult.manifestTxId}</dd>
        </div>
        <div>
          <dt>Manifest Gateway</dt>
          <dd>
            <a href={gatewayUrl(uploadResult.manifestTxId)} target="_blank" rel="noreferrer">
              {gatewayUrl(uploadResult.manifestTxId)}
            </a>
          </dd>
        </div>
      </dl>

      <ul className="file-list">
        {uploadResult.fileTxIds.map((txId, index) => (
          <li key={txId}>
            <span>File #{index + 1}</span>
            <a href={gatewayUrl(txId)} target="_blank" rel="noreferrer" className="mono">
              {txId}
            </a>
          </li>
        ))}
      </ul>

      {ensResult ? (
        <div className="success-block">
          <p>
            Linked ENS subdomain: <span className="mono">{ensResult.subdomain}</span>
          </p>
          {network === 'mainnet' ? (
            <a href={`https://${ensResult.subdomain}.limo`} target="_blank" rel="noreferrer">
              https://{ensResult.subdomain}.limo
            </a>
          ) : (
            <p className="muted">Sepolia ENS links are displayed as name + tx hash (gateway availability may vary).</p>
          )}
          <p className="mono">Subnode tx: {ensResult.txHash}</p>
          <p className="mono">Contenthash tx: {ensResult.contenthashTxHash}</p>
        </div>
      ) : null}
    </section>
  );
}
