import { useState } from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { FieldSelect } from './FieldSelect.jsx';
import Meter from './Meter.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import {
  estoqueCell,
  formatDateShort,
  pomarCell,
  sealTone,
  stageTone,
} from '../lib/format.js';

const FILTERS = [
  ['todos', 'Todos os lotes'],
  ['selo', 'Lotes com selo'],
  ['reprovado', 'Reprovados'],
  ['analise', 'Em análise'],
];

function SealMark({ tone }) {
  if (tone === 'rejected') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
      </svg>
    );
  }
  if (tone === 'pending') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 15l-2 5-1.5-2-2.5 1 1.5-5.5M12 15l2 5 1.5-2 2.5 1-1.5-5.5M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SeloSection({
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
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const selected = lotes.find((lote) => lote.id_lote === selectedId);
  const isPomar = (audit?.etapa_atual || selected?.etapa_atual) === 'pomar';
  const seal = sealTone(audit?.status_selo);
  const pomar = stageTone(audit?.detalhamento_por_criterio?.pomar?.total_leituras, audit?.aprovado_pomar);
  const estoque = stageTone(audit?.detalhamento_por_criterio?.estoque?.total_leituras, audit?.aprovado_estoque);
  const criteria = isPomar ? audit?.detalhamento_por_criterio?.pomar : audit?.detalhamento_por_criterio?.estoque;

  async function confirmStage() {
    if (!selected) return;
    setBusy(true);
    try {
      await onChangeStage(selected, isPomar ? 'estoque' : 'pomar');
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="selo-section" aria-labelledby="selo-heading">
      <div className="selo-header">
        <div className="selo-title-wrap">
          <span className="eyebrow">Certificação agronômica</span>
          <h2 id="selo-heading">Selo de Qualidade da Manga</h2>
          <p>O lote só recebe o selo se atingir pelo menos 70% de conformidade no pomar e na câmara fria.</p>
        </div>
        <div className="selo-controls">
          {lotes.some((lote) => lote.id_lote === selectedId) ? (
            <FieldSelect
              id="lote-select"
              label="Lote"
              value={String(selectedId)}
              placeholder="Nenhum lote nesta categoria"
              onValueChange={(value) => onSelect(Number(value))}
              options={lotes.map((lote) => ({ value: String(lote.id_lote), label: `${lote.codigo_lote} - ${lote.nome}` }))}
            />
          ) : <p className="hint">Nenhum lote nesta categoria</p>}
          <button
            className={isPomar ? 'action-btn primary-btn' : 'action-btn'}
            type="button"
            disabled={!selected}
            onClick={() => setConfirm(selected)}
          >
            {isPomar ? 'Colher lote' : 'Retornar ao pomar'}
          </button>
          <button className="action-btn" type="button" onClick={onRecalculate}>Recalcular</button>
        </div>
      </div>

      <ToggleGroup.Root className="filter-pills" type="single" value={filter} aria-label="Filtro de lotes" onValueChange={(value) => { if (value) onFilter(value); }}>
        {FILTERS.map(([value, label]) => (
          <ToggleGroup.Item key={value} className={value === 'selo' ? 'filter-pill selo-highlight' : 'filter-pill'} value={value}>
            {label} ({counts[value]})
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>

      <div className="dash-lotes-table-wrap">
        <div className="table-scroll">
          <table className="dash-lotes-table">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Variedade</th>
                <th>Etapa atual</th>
                <th>Pomar</th>
                <th>Câmara fria</th>
                <th>Selo</th>
                <th>Inspeção</th>
              </tr>
            </thead>
            <tbody>
              {lotes.length ? lotes.map((lote) => {
                const pomarStatus = pomarCell(lote);
                const estoqueStatus = estoqueCell(lote);
                const tone = sealTone(lote.status_selo);
                const active = lote.id_lote === selectedId;
                return (
                  <tr key={lote.id_lote} data-selected={active} onClick={() => onSelect(lote.id_lote)}>
                    <td>
                      <span className="lote-id-badge">{lote.codigo_lote}</span>
                      <div className="lote-name-cell">{lote.nome}</div>
                    </td>
                    <td><strong>{lote.variedade || 'Tommy Atkins'}</strong></td>
                    <td>
                      <span className={lote.etapa_atual === 'pomar' ? 'etapa-pill pomar' : 'etapa-pill estoque'}>
                        {lote.etapa_atual === 'pomar' ? 'Pomar' : 'Câmara fria'}
                      </span>
                    </td>
                    <td><span className={`stage-status-tag ${pomarStatus.className}`}>{pomarStatus.text}</span></td>
                    <td><span className={`stage-status-tag ${estoqueStatus.className}`}>{estoqueStatus.text}</span></td>
                    <td><span className={`selo-status-badge ${tone.tone}`}>{tone.table}</span></td>
                    <td>
                      <button className="audit-action-btn" type="button" onClick={() => onSelect(lote.id_lote)}>
                        {active ? 'Inspecionando' : 'Inspecionar'}
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td className="empty-row" colSpan={7}>Nenhum lote encontrado nesta categoria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="inspecao-separator">
        <span className="eyebrow">Auditoria</span>
        <h3>Inspeção do lote: <span>{audit ? `${audit.codigo_lote} · ${audit.nome}` : '—'}</span></h3>
      </div>

      <div className="selo-grid">
        <div className="selo-badge-box">
          <div className={`seal-emblem ${seal.tone}`}><SealMark tone={seal.tone} /></div>
          <h3 className="seal-title">{seal.title}</h3>
          <p className="seal-subtitle">{audit?.justificativa || 'Selecione um lote para calcular a conformidade das duas etapas.'}</p>
          <span className={`badge-tag ${seal.tone}`}>{seal.badge}</span>
        </div>
        <div className="selo-stats-box">
          <div className="selo-info-row">
            <p className="lote-meta-item">Lote: <strong>{audit ? `${audit.codigo_lote} · ${audit.nome}` : '—'}</strong> ({audit?.variedade || '—'})</p>
            <span className={isPomar ? 'stage-pill pomar' : 'stage-pill estoque'}>{isPomar ? 'Pomar' : 'Câmara fria'}</span>
          </div>
          <p className="lote-meta-item">
            Período: <strong>{audit ? `De ${formatDateShort(audit.periodo?.data_inicio)} até ${formatDateShort(audit.periodo?.data_fim)}` : '—'}</strong>
            {' '}({audit?.periodo?.dias_totais || 0} dias · {audit?.total_leituras || 0} leituras)
          </p>
          <div className="stages-compare-grid">
            <article className={`stage-box ${pomar.box}`}>
              <div className="stage-box-head"><span className="stage-box-title">Etapa 1: Pomar</span><span className={`stage-box-badge ${pomar.badge}`}>{pomar.label}</span></div>
              <div className="stage-box-value">{Number(audit?.percentual_pomar || 0).toFixed(1)}%</div>
              <p className="stage-box-hint">Meta: ≥ 70% (24–30 °C, 45–70%, luz &gt; 40 mil lux)</p>
            </article>
            <article className={`stage-box ${estoque.box}`}>
              <div className="stage-box-head"><span className="stage-box-title">Etapa 2: Câmara fria</span><span className={`stage-box-badge ${estoque.badge}`}>{estoque.label}</span></div>
              <div className="stage-box-value">{Number(audit?.percentual_estoque || 0).toFixed(1)}%</div>
              <p className="stage-box-hint">Meta: ≥ 70% (10–13 °C, 85–90%, luz &lt; 50 lux)</p>
            </article>
          </div>
          <div className="progress-wrap">
            <div className="progress-head">
              <span>Média geral do lote</span>
              <span className="progress-value">{Number(audit?.percentual_geral || 0).toFixed(1)}%</span>
            </div>
            <Meter large value={audit?.percentual_geral || 0} />
            <div className="progress-target-hint"><span>0%</span><span className="mark">Exige ≥ 70% nas duas etapas</span><span>100%</span></div>
          </div>
          <p className="hint">Critérios da etapa atual ({isPomar ? 'pomar' : 'câmara fria'})</p>
          <div className="criteria-grid">
            <Criterion name="Temperatura" percent={criteria?.temperatura?.conformidade_percent} range={criteria ? `${criteria.temperatura.ideal_min} °C a ${criteria.temperatura.ideal_max} °C` : '—'} />
            <Criterion name="Umidade do ar" percent={criteria?.umidade?.conformidade_percent} range={criteria ? `${criteria.umidade.ideal_min}% a ${criteria.umidade.ideal_max}%` : '—'} />
            <Criterion name="Luminosidade" percent={criteria?.luminosidade?.conformidade_percent} range={isPomar ? 'Ideal: > 40.000 lux' : 'Ideal: < 50 lux'} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={isPomar ? 'Confirmar colheita?' : 'Retornar o lote ao pomar?'}
        description={isPomar
          ? `O lote ${confirm?.codigo_lote || ''} será movido para a câmara fria. As próximas leituras entram na etapa 2.`
          : `O lote ${confirm?.codigo_lote || ''} volta para a etapa de pomar.`}
        confirmLabel={isPomar ? 'Colher lote' : 'Retornar ao pomar'}
        busy={busy}
        onOpenChange={(open) => { if (!open) setConfirm(null); }}
        onConfirm={confirmStage}
      />
    </section>
  );
}

function Criterion({ name, percent, range }) {
  const value = Number(percent || 0);
  return (
    <article className="criterion-card">
      <div className="criterion-head"><span className="criterion-name">{name}</span><span className="criterion-pct">{value.toFixed(0)}%</span></div>
      <Meter value={value} />
      <p className="criterion-range">{range}</p>
    </article>
  );
}
