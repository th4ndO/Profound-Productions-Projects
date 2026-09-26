import { useMemo, useSyncExternalStore } from 'react';
import { createBrowserStore } from './state/fileStore';

export default function App() {
  const store = useMemo(() => createBrowserStore(), []);
  const files = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return (
    <main className="p-6">
      <input type="file" multiple onChange={(e) => e.target.files && store.add(e.target.files)} />
      <ul>
        {files.map((f) => (
          <li key={f.id} data-testid="file" data-status={f.status}>
            {f.name} · {f.status} · {f.records.length} · {Math.round(f.progress * 100)}% · {f.error ?? ''} · {f.warnings.join(' ')}
          </li>
        ))}
      </ul>
    </main>
  );
}
