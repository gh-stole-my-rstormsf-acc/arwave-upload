import { humanFileSize } from '../lib/validators';
import type { FileValidationResult } from '../types/domain';

interface FilePickerProps {
  files: File[];
  validation: FileValidationResult;
  onSelectFiles: (files: File[]) => void;
}

export function FilePicker(props: FilePickerProps) {
  const { files, validation, onSelectFiles } = props;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Files</h2>
        <span className="mono">{humanFileSize(validation.totalBytes)}</span>
      </div>

      <label className="file-picker" htmlFor="file-input">
        <input
          id="file-input"
          type="file"
          multiple
          onChange={(event) => onSelectFiles(Array.from(event.target.files ?? []))}
        />
        <strong>Choose files</strong>
        <span>Any type, up to 100 MB total per batch.</span>
      </label>

      {validation.errors.length > 0 ? (
        <ul className="error-list">
          {validation.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}

      {files.length > 0 ? (
        <ul className="file-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <span>{file.name}</span>
              <span className="mono">{humanFileSize(file.size)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No files selected yet.</p>
      )}
    </section>
  );
}
