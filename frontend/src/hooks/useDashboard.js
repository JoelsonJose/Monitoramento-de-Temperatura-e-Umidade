import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { applyFilter, countBySeal } from '../lib/format.js';

export function useDashboard(token, screen, onUnauthorized) {
  const [connection, setConnection] = useState('online');
  const [notice, setNotice] = useState(null);
  const [latest, setLatest] = useState(null);
  const [readings, setReadings] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('todos');
  const [audit, setAudit] = useState(null);
  const [metric, setMetric] = useState('temperature_c');
  const [listRevision, setListRevision] = useState(0);
  const [auditRevision, setAuditRevision] = useState(0);
  const screenRef = useRef(screen);
  const connectionRef = useRef(connection);
  screenRef.current = screen;
  connectionRef.current = connection;

  const fail = useCallback((error) => {
    if (error.status === 401) {
      onUnauthorized();
      return true;
    }
    return false;
  }, [onUnauthorized]);

  const reloadLotes = useCallback(async () => {
    try {
      const data = await api('/api/v1/lotes', { token });
      setLotes(data.lotes || []);
    } catch (error) {
      if (!fail(error)) setNotice({ text: error.message, error: true });
    }
  }, [token, fail]);

  const loadAudit = useCallback(async (loteId) => {
    if (!loteId) {
      setAudit(null);
      return;
    }
    try {
      const data = await api(`/api/v1/lotes/${loteId}/qualidade`, { token });
      setAudit(data);
    } catch (error) {
      if (!fail(error)) setNotice({ text: error.message, error: true });
    }
  }, [token, fail]);

  const refresh = useCallback(async () => {
    try {
      const [latestBody, historyBody] = await Promise.all([
        api('/api/v1/readings/latest', { token }),
        api('/api/v1/readings?limit=50', { token }),
      ]);
      setLatest(latestBody.reading || null);
      setReadings(Array.isArray(historyBody.readings) ? [...historyBody.readings].reverse() : []);
      setConnection((current) => (current === 'usb' ? 'usb' : 'online'));
      setNotice(null);
    } catch (error) {
      if (fail(error)) return;
      setConnection((current) => (current === 'usb' ? 'usb' : 'offline'));
      setNotice({ text: error.message, error: true });
    }
  }, [token, fail]);

  useEffect(() => {
    reloadLotes();
  }, [reloadLotes, listRevision]);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (screenRef.current === 'dashboard') refresh();
    }, 10000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const visible = applyFilter(lotes, filter);
    setSelectedId((current) => {
      if (!visible.length) return null;
      return visible.some((lote) => lote.id_lote === current) ? current : visible[0].id_lote;
    });
  }, [lotes, filter]);

  useEffect(() => {
    loadAudit(selectedId);
  }, [selectedId, auditRevision, loadAudit]);

  useEffect(() => {
    function sync() {
      if (connectionRef.current === 'usb') return;
      setConnection(navigator.onLine ? 'online' : 'offline');
    }
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  async function changeStage(lote, nextStage) {
    if (nextStage === 'estoque') {
      await api(`/api/v1/lotes/${lote.id_lote}/colher`, { method: 'POST', token });
      setNotice({ text: `Lote ${lote.codigo_lote} colhido. O monitoramento segue na câmara fria.`, error: false });
    } else {
      await api(`/api/v1/lotes/${lote.id_lote}`, {
        method: 'PATCH',
        token,
        body: { etapa_atual: 'pomar' },
      });
      setNotice({ text: `Lote ${lote.codigo_lote} retornou ao pomar.`, error: false });
    }
    await reloadLotes();
    setAuditRevision((current) => current + 1);
  }

  function showUsbReading(reading) {
    setConnection('usb');
    setLatest({
      ...reading,
      device_id: reading.device_id || 'esp32c3-01',
      timestamp: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      source: 'usb',
    });
    setNotice({ text: 'ESP32 conectada pelo cabo USB. A telemetria ao vivo está ativa.', error: false });
    setAuditRevision((current) => current + 1);
  }

  const visible = applyFilter(lotes, filter);

  return {
    connection,
    notice,
    latest,
    readings,
    lotes: visible,
    allLotes: lotes,
    counts: countBySeal(lotes),
    selectedId,
    setSelectedId,
    filter,
    setFilter,
    audit,
    metric,
    setMetric,
    refresh,
    reloadLotes,
    recalculate: () => loadAudit(selectedId),
    changeStage,
    showUsbReading,
    bump: () => {
      setListRevision((current) => current + 1);
      setAuditRevision((current) => current + 1);
    },
  };
}
