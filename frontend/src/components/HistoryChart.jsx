import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { buildSeries } from '../lib/chart.js';
import { formatClock, formatDate } from '../lib/format.js';

const METRICS = [
  { value: 'temperature_c', label: 'Temperatura' },
  { value: 'humidity_percent', label: 'Umidade' },
  { value: 'luminosity_lux', label: 'Luminosidade' },
];

export default function HistoryChart({ readings, metric, onMetric }) {
  const series = buildSeries(readings, metric);
  const last = series.points?.[series.points.length - 1];

  return (
    <section className="panel chart-panel" aria-labelledby="chart-title">
      <div className="panel-heading">
        <div>
          <h2 id="chart-title">Histórico das leituras</h2>
          <p className="panel-subtitle">Variação contínua registrada pelos sensores</p>
        </div>
        <span className="range-label">Últimas 50 leituras</span>
      </div>
      <ToggleGroup.Root
        className="chart-tabs"
        type="single"
        value={metric}
        aria-label="Métrica do gráfico"
        onValueChange={(value) => { if (value) onMetric(value); }}
      >
        {METRICS.map((item) => (
          <ToggleGroup.Item key={item.value} className="chart-tab" value={item.value}>
            {item.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      <div className="chart-wrap">
        <svg className="history-chart" viewBox="0 0 760 260" role="img" aria-label={`Gráfico histórico de ${metric}`}>
          {series.empty ? null : (
            <>
              <defs>
                <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series.fill} stopOpacity="0.32" />
                  <stop offset="100%" stopColor={series.fill} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {series.grid.map((row) => (
                <g key={row.label}>
                  <line x1={series.left} y1={row.y} x2={series.width - series.right} y2={row.y} stroke="#edf0e9" />
                  <text x={series.left - 10} y={row.y + 4} textAnchor="end" fill="#89958d" fontSize="11">{row.label}</text>
                </g>
              ))}
              <path d={series.area} fill="url(#chart-fill)" />
              <path d={series.line} fill="none" stroke={series.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {last && series.points.length > 1 ? (
                <circle cx={last.x} cy={last.y} r="7" fill={series.color} stroke="#fff" strokeWidth="3">
                  <title>{`${last.value.toFixed(series.digits)} ${series.unit} · ${formatDate(last.time)}`}</title>
                </circle>
              ) : null}
              <text x={series.left} y={series.height - 8} fill="#89958d" fontSize="10">{formatClock(series.firstTime)}</text>
              <text x={series.width - series.right} y={series.height - 8} textAnchor="end" fill="#89958d" fontSize="10">{formatClock(series.lastTime)}</text>
            </>
          )}
        </svg>
        {series.empty ? (
          <div className="chart-empty">
            <strong>O gráfico aparecerá com as leituras</strong>
            <br />
            Assim que a ESP32 enviar dados, o histórico fica aqui.
          </div>
        ) : null}
      </div>
    </section>
  );
}
