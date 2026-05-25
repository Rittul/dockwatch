import { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';

const REFRESH_INTERVAL = 5000;

const statusColor = (status = '') => {
  const s = status.toLowerCase();
  if (s.includes('up') || s.includes('running')) return '#22c55e';
  if (s.includes('exited') || s.includes('stopped')) return '#ef4444';
  if (s.includes('paused')) return '#f59e0b';
  return '#94a3b8';
};

const statusLabel = (status = '') => {
  const s = status.toLowerCase();
  if (s.includes('up') || s.includes('running')) return 'running';
  if (s.includes('exited')) return 'exited';
  if (s.includes('paused')) return 'paused';
  return 'unknown';
};

const formatBytes = (str = '') => str;

const shortId = (id = '') => id.slice(0, 12);

const initials = (name = '') =>
  name.replace(/^\//, '').replace(/dockwatch-?/, '').slice(0, 2).toUpperCase();

const colorFor = (name = '') => {
  const colors = [
    { bg: '#dbeafe', text: '#1e40af' },
    { bg: '#dcfce7', text: '#166534' },
    { bg: '#fef3c7', text: '#92400e' },
    { bg: '#fce7f3', text: '#9d174d' },
    { bg: '#ede9fe', text: '#5b21b6' },
    { bg: '#e0f2fe', text: '#075985' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

function StatCard({ label, value, icon, sub }) {
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: '1rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <i className={`ti ${icon}`} style={{ fontSize: 16, color: 'var(--color-text-tertiary)' }} aria-hidden="true" />
      </div>
      <span style={{ fontSize: 28, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>{value ?? '—'}</span>
      {sub && <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{sub}</span>}
    </div>
  );
}

function CpuBar({ pct }) {
  const p = Math.min(100, Math.max(0, parseFloat(pct) || 0));
  const color = p > 80 ? '#ef4444' : p > 60 ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>utilisation</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{p.toFixed(1)}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: 'var(--color-background-tertiary)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${p}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function ContainerCard({ container, onViewLogs, selected }) {
  const label = statusLabel(container.status);
  const dot = statusColor(container.status);
  const name = (container.name || '').replace(/^\//, '');
  const col = colorFor(name);
  const active = selected === container.id;

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: active ? '1.5px solid #3b82f6' : '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: '1rem 1.25rem',
      cursor: 'pointer',
      transition: 'border-color 0.15s',
    }} onClick={() => onViewLogs(container.id, name)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: col.bg, color: col.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 500, flexShrink: 0,
        }}>{initials(name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 99,
              background: label === 'running' ? '#dcfce7' : label === 'exited' ? '#fee2e2' : '#fef3c7',
              color: label === 'running' ? '#166534' : label === 'exited' ? '#991b1b' : '#92400e',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, display: 'inline-block' }} />
              {label}
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>{container.image}</span>
        </div>
        <i className="ti ti-terminal-2" style={{ fontSize: 16, color: active ? '#3b82f6' : 'var(--color-text-tertiary)', marginTop: 2 }} aria-hidden="true" />
      </div>
    </div>
  );
}

export default function App() {
  const [system, setSystem] = useState(null);
  const [containers, setContainers] = useState([]);
  const [logs, setLogs] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const prevContainerIds = useRef('');
  const logsRef = useRef(null);

  const fetchSystemInfo = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/system');
      setSystem(res.data);
    } catch {}
  }, []);

  const fetchContainers = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5001/status');
      const data = res.data;
      setContainers(data);
      setLastUpdated(new Date());

      const newIds = (data || []).map(c => c.id).sort().join(',');
      if (prevContainerIds.current && newIds !== prevContainerIds.current && selectedId) {
        fetchLogs(selectedId, selectedName);
      }
      prevContainerIds.current = newIds;
    } catch {}
  }, [selectedId, selectedName]);

  const fetchLogs = useCallback(async (id, name) => {
    if (!id) return;
    setLoadingLogs(true);
    setSelectedId(id);
    setSelectedName(name);
    try {
      const res = await axios.get(`http://localhost:5001/logs/${id}`);
      setLogs(res.data);
      setTimeout(() => { if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight; }, 50);
    } catch {
      setLogs('Failed to fetch logs.');
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemInfo();
    fetchContainers();
    const sysTimer = setInterval(fetchSystemInfo, REFRESH_INTERVAL);
    const ctrTimer = setInterval(fetchContainers, REFRESH_INTERVAL);
    return () => { clearInterval(sysTimer); clearInterval(ctrTimer); };
  }, [fetchSystemInfo, fetchContainers]);

  useEffect(() => {
    if (selectedId) {
      const t = setInterval(() => fetchLogs(selectedId, selectedName), REFRESH_INTERVAL);
      return () => clearInterval(t);
    }
  }, [selectedId, selectedName, fetchLogs]);

  const running = containers.filter(c => statusLabel(c.status) === 'running').length;
  const stopped = containers.filter(c => statusLabel(c.status) !== 'running').length;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-background-tertiary)',
      fontFamily: 'var(--font-sans)',
      color: 'var(--color-text-primary)',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--color-background-primary)',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        padding: '0 2rem',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-brand-docker" style={{ fontSize: 22, color: '#3b82f6' }} aria-hidden="true" />
          <span style={{ fontWeight: 500, fontSize: 16 }}>DockWatch</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', background: 'var(--color-background-secondary)', padding: '2px 8px', borderRadius: 99, border: '0.5px solid var(--color-border-tertiary)' }}>dashboard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            {lastUpdated ? `updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'loading…'}
          </span>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* System stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div style={{
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-lg)',
            padding: '1rem 1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>CPU</span>
              <i className="ti ti-cpu" style={{ fontSize: 16, color: 'var(--color-text-tertiary)' }} aria-hidden="true" />
            </div>
            <span style={{ fontSize: 28, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>{system?.cpu != null ? `${parseFloat(system.cpu).toFixed(1)}%` : '—'}</span>
            <CpuBar pct={system?.cpu} />
          </div>

          <StatCard label="Total RAM" value={system?.totalRam ?? '—'} icon="ti-device-desktop-analytics" />
          <StatCard label="Used RAM" value={system?.usedRam ?? '—'} icon="ti-circle-half-2" />
          <StatCard label="Running" value={running} icon="ti-player-play" sub={`${stopped} stopped`} />
          <StatCard label="Total" value={containers.length} icon="ti-box" sub="containers tracked" />
        </div>

        {/* Main area */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>

          {/* Container list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Containers</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>click to view logs</span>
            </div>
            {containers.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, border: '0.5px dashed var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)' }}>
                No containers found
              </div>
            )}
            {containers.map(c => (
              <ContainerCard
                key={c.id}
                container={c}
                onViewLogs={fetchLogs}
                selected={selectedId}
              />
            ))}
          </div>

          {/* Logs panel */}
          <div style={{
            background: '#0f172a',
            borderRadius: 'var(--border-radius-lg)',
            border: '0.5px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 480,
          }}>
            <div style={{
              padding: '0.75rem 1rem',
              borderBottom: '0.5px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-terminal-2" style={{ fontSize: 15, color: '#64748b' }} aria-hidden="true" />
                <span style={{ fontSize: 13, color: selectedName ? '#94a3b8' : '#475569', fontFamily: 'var(--font-mono)' }}>
                  {selectedName ? `logs: ${selectedName}` : 'select a container to view logs'}
                </span>
              </div>
              {loadingLogs && (
                <span style={{ fontSize: 11, color: '#475569' }}>fetching…</span>
              )}
              {selectedId && !loadingLogs && (
                <button
                  onClick={() => fetchLogs(selectedId, selectedName)}
                  style={{ fontSize: 11, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <i className="ti ti-refresh" style={{ fontSize: 13 }} aria-hidden="true" /> refresh
                </button>
              )}
            </div>
            <div
              ref={logsRef}
              style={{
                flex: 1,
                padding: '1rem',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                lineHeight: 1.7,
                color: '#94a3b8',
                whiteSpace: 'pre-wrap',
                overflowY: 'auto',
                maxHeight: 520,
              }}
            >
              {logs || (
                <span style={{ color: '#334155' }}>
                  {selectedId ? 'No log output.' : '$ waiting for selection…'}
                </span>
              )}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
