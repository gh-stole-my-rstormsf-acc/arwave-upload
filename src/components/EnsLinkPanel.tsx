import type { EnsNameCandidate, FlowState } from '../types/domain';

interface EnsLinkPanelProps {
  ensNames: EnsNameCandidate[];
  selectedName: string;
  onSelectedNameChange: (name: string) => void;
  suggestedLabel?: string;
  flowState: FlowState;
  enabled: boolean;
  onLink: () => void;
}

export function EnsLinkPanel(props: EnsLinkPanelProps) {
  const {
    ensNames,
    selectedName,
    onSelectedNameChange,
    suggestedLabel,
    flowState,
    enabled,
    onLink,
  } = props;

  const isBusy = flowState === 'linking';

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>ENS Linking</h2>
        <span className="mono">{ensNames.length} names</span>
      </div>

      {ensNames.length === 0 ? (
        <p className="muted">No ENS names found for this wallet. Upload still works without ENS linking.</p>
      ) : (
        <>
          <label htmlFor="ens-name-select">Parent ENS name</label>
          <select
            id="ens-name-select"
            value={selectedName}
            onChange={(event) => onSelectedNameChange(event.target.value)}
          >
            {ensNames.map((name) => (
              <option key={name.name} value={name.name}>
                {name.name} ({name.source})
              </option>
            ))}
          </select>

          <p className="muted">
            Suggested subdomain:{' '}
            <span className="mono">{suggestedLabel ? `${suggestedLabel}.${selectedName}` : 'calculate after upload'}</span>
          </p>

          <button type="button" disabled={!enabled || isBusy || ensNames.length === 0} onClick={onLink}>
            {isBusy ? 'Linking...' : 'Link Manifest to ENS'}
          </button>
        </>
      )}
    </section>
  );
}
