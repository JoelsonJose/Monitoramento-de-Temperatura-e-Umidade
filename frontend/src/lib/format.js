export const VARIEDADES = ['Tommy Atkins', 'Palmer', 'Keitt', 'Kent', 'Haden'];
export const DEVICE_ID = 'esp32c3-01';
export const PAGE_SIZE = 8;

export function formatDate(value) {
  if (!value) return 'Não informado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Não informado';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
}

export function formatDateShort(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

export function formatClock(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function luminosityCaption(lux) {
  if (lux === null || lux === undefined || Number.isNaN(Number(lux))) return 'Sensor LDR calibrado';
  const value = Number(lux);
  if (value >= 35000) return 'Sol pleno no pomar';
  if (value <= 60) return 'Ambiente câmara fria';
  return 'Iluminação intermediária';
}

export function applyFilter(lotes, filter) {
  if (filter === 'selo') return lotes.filter((lote) => lote.status_selo === 'aprovado');
  if (filter === 'reprovado') return lotes.filter((lote) => lote.status_selo === 'reprovado');
  if (filter === 'analise') return lotes.filter((lote) => lote.status_selo === 'em_analise');
  return lotes;
}

export function countBySeal(lotes) {
  return {
    todos: lotes.length,
    selo: lotes.filter((lote) => lote.status_selo === 'aprovado').length,
    reprovado: lotes.filter((lote) => lote.status_selo === 'reprovado').length,
    analise: lotes.filter((lote) => lote.status_selo === 'em_analise').length,
  };
}

export function stageTone(total, approved) {
  if (!total) return { box: 'pending', badge: 'wait', label: 'Pendente' };
  if (approved) return { box: 'passed', badge: 'ok', label: 'Aprovado (≥ 70%)' };
  return { box: 'failed', badge: 'fail', label: 'Reprovado (< 70%)' };
}

export function pomarCell(lote) {
  const value = Number(lote.percentual_pomar || 0);
  if (value >= 70) return { className: 'ok', text: `Aprovado (${value.toFixed(1)}%)` };
  return { className: 'fail', text: `Reprovado (${value.toFixed(1)}%)` };
}

export function estoqueCell(lote) {
  const value = Number(lote.percentual_estoque || 0);
  if (lote.etapa_atual === 'pomar' && value === 0) return { className: 'wait', text: 'Aguardando Colheita' };
  if (value >= 70) return { className: 'ok', text: `Aprovado (${value.toFixed(1)}%)` };
  return { className: 'fail', text: `Reprovado (${value.toFixed(1)}%)` };
}

export function sealTone(status) {
  if (status === 'aprovado') {
    return {
      tone: 'approved',
      title: 'Selo de Qualidade Concedido',
      badge: 'Selo Concedido (Aprovado nas 2 Etapas)',
      table: 'Selo Concedido',
      compact: 'Aprovado',
    };
  }
  if (status === 'reprovado') {
    return {
      tone: 'rejected',
      title: 'Selo Não Concedido',
      badge: 'Reprovado / Requer Ajuste',
      table: 'Não Concedido',
      compact: 'Reprovado',
    };
  }
  return {
    tone: 'pending',
    title: 'Selo em Análise',
    badge: 'Aguardando 2ª Etapa',
    table: 'Em Análise',
    compact: 'Análise',
  };
}

export function devicePresentation(reading, connection) {
  if (connection === 'offline' && !reading) {
    return { status: 'Sem resposta da API', caption: 'ESP32-C3 · Plug & Play' };
  }
  if (connection === 'usb' || reading?.source === 'usb') {
    return { status: 'Online via USB', caption: 'ESP32-C3 · cabo USB conectado' };
  }
  if (!reading) return { status: 'Aguardando dados', caption: 'ESP32-C3 · Plug & Play' };
  const lastSeen = reading.last_seen_at ? new Date(reading.last_seen_at) : null;
  const recent = lastSeen && Number.isFinite(lastSeen.getTime()) && Date.now() - lastSeen.getTime() <= 30000;
  return {
    status: recent ? 'Online' : 'Sem leitura recente',
    caption: `ESP32-C3 · sequência ${reading.sequence}`,
  };
}
