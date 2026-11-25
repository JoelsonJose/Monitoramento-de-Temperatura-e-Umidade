import HistoryChart from './HistoryChart.jsx';
import SeloSection from './SeloSection.jsx';
import { devicePresentation, formatDate, luminosityCaption } from '../lib/format.js';

function Metric({ title, wash, tone, value, unit, caption, icon, device = false }) {
  return (
    <article className={device ? 'metric-card device-card' : 'metric-card'} style={{ '--wash': wash, '--tone': tone }}>
      <div className="metric-head">
        <span className="metric-title">{title}</span>
        <span className="metric-icon" aria-hidden="true">{icon}</span>
      </div>
      <p className="metric-value">{value}{unit ? <span className="metric-unit">{unit}</span> : null}</p>
      <p className="metric-caption">{caption}</p>
    </article>
  );
}

export default function DashboardView({
  reading,
  readings,
  connection,
  notice,
  metric,
  onMetric,
  onRefresh,
  lotes,
  counts,
  filter,
  onFilter,
  selectedId,
  onSelect,
  audit,
  onRecalculate,
  onChangeStage,
}) {
  const device = devicePresentation(reading, connection);
  const lux = reading && reading.luminosity_lux !== null && reading.luminosity_lux !== undefined
    ? Number(reading.luminosity_lux)
    : null;
  const recordTitle = reading ? `Dispositivo ${reading.device_id || 'esp32c3-01'}` : 'Ainda sem leitura';
  const recordMeta = reading?.source === 'usb'
    ? `Leitura direta via cabo USB às ${new Date().toLocaleTimeString('pt-BR')}`
    : reading
      ? `Sequência ${reading.sequence} · leitura em ${formatDate(reading.timestamp)} · último contato ${formatDate(reading.last_seen_at)}`
      : 'Aguardando o primeiro envio do dispositivo.';

  return (
    <main className="dashboard">
      <div className="welcome-row">
        <div>
          <span className="eyebrow">Telemetria e qualidade</span>
          <h1>Painel de monitoramento</h1>
          <p>Condições do pomar e da câmara fria, com a certificação do lote.</p>
        </div>
        <button className="action-btn" type="button" onClick={onRefresh}>Atualizar agora</button>
      </div>

      <section className="summary" aria-label="Leituras atuais">
        <Metric title="Temperatura" wash="#fff2d2" tone="#cf8a0d" unit="°C" caption="Sensor DHT11" value={reading ? Number(reading.temperature_c).toFixed(1) : '—'} icon={<Thermometer />} />
        <Metric title="Umidade do ar" wash="#e5f2f1" tone="#398f88" unit="%" caption="Umidade relativa" value={reading ? Number(reading.humidity_percent).toFixed(1) : '—'} icon={<Drop />} />
        <Metric title="Luminosidade" wash="#fef5dc" tone="#d98816" unit="lux" caption={lux === null ? 'Sensor LDR calibrado' : luminosityCaption(lux)} value={lux === null ? '—' : lux.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} icon={<Sun />} />
        <Metric device title="Dispositivo" value={device.status} caption={device.caption} icon={<Board />} />
      </section>

      <SeloSection
        lotes={lotes}
        counts={counts}
        filter={filter}
        onFilter={onFilter}
        selectedId={selectedId}
        onSelect={onSelect}
        audit={audit}
        onRecalculate={onRecalculate}
        onChangeStage={onChangeStage}
      />

      <div className="content-grid">
        <HistoryChart readings={readings} metric={metric} onMetric={onMetric} />
        <aside className="panel record-panel" aria-labelledby="record-title">
          <h2 id="record-title">Último registro</h2>
          <p className="panel-subtitle">Informações recebidas da placa</p>
          <div className="record-illustration" aria-hidden="true">
            <svg viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="49" fill="#E4EFDF" />
              <path d="M45 79c-13-15-10-39 2-53 15-5 31 4 33 22 3 22-15 43-35 31Z" fill="#F2A51A" />
              <path d="M59 31c0-10 8-16 18-15-2 9-8 14-18 15Z" fill="#51885A" />
              <rect x="73" y="65" width="27" height="24" rx="5" fill="#245940" />
            </svg>
          </div>
          <p className="record-device">{recordTitle}</p>
          <p className="record-meta">{recordMeta}</p>
          {notice ? <div className={notice.error ? 'notice error' : 'notice'} role="status">{notice.text}</div> : null}
        </aside>
      </div>
      <footer className="dashboard-footer">Manga Trace · Monitoramento IoT e Selo de Qualidade · Atualização a cada 10 segundos</footer>
    </main>
  );
}

function Thermometer() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 14.8V5a3 3 0 1 0-6 0v9.8a5 5 0 1 0 6 0Z" /></svg>;
}
function Drop() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3.5S5.5 11 5.5 15.1a6.5 6.5 0 1 0 13 0C18.5 11 12 3.5 12 3.5Z" /></svg>;
}
function Sun() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
}
function Board() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="6" y="4" width="12" height="16" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>;
}
