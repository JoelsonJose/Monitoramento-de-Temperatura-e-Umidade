import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import ConfirmDialog from './ConfirmDialog.jsx';
import { Field, FieldSelect } from './FieldSelect.jsx';
import { api } from '../lib/api.js';
import {
  DEVICE_ID,
  PAGE_SIZE,
  VARIEDADES,
  sealTone,
  toDatetimeLocal,
} from '../lib/format.js';

const EMPTY = {
  id: '',
  codigo_lote: '',
  nome: '',
  variedade: 'Tommy Atkins',
  etapa_atual: 'pomar',
  data_inicio: '',
  data_colheita: '',
  data_fim: '',
};

function formFromLote(lote) {
  if (!lote) {
    return { ...EMPTY, data_inicio: toDatetimeLocal(new Date().toISOString()) };
  }
  return {
    id: String(lote.id_lote),
    codigo_lote: lote.codigo_lote || '',
    nome: lote.nome || '',
    variedade: lote.variedade || 'Tommy Atkins',
    etapa_atual: lote.etapa_atual || 'pomar',
    data_inicio: toDatetimeLocal(lote.data_inicio),
    data_colheita: toDatetimeLocal(lote.data_colheita),
    data_fim: toDatetimeLocal(lote.data_fim),
  };
}

export default function LotesView({ token, lotes, onChanged, onNotice }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('todos');
  const [etapa, setEtapa] = useState('todas');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingHarvest, setPendingHarvest] = useState(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => lotes.filter((lote) => {
    const text = `${lote.codigo_lote || ''} ${lote.nome || ''} ${lote.variedade || ''}`.toLowerCase();
    const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
    const matchesStatus = status === 'todos' || lote.status_selo === status;
    const matchesEtapa = etapa === 'todas' || lote.etapa_atual === etapa;
    return matchesQuery && matchesStatus && matchesEtapa;
  }), [lotes, query, status, etapa]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);
  const counts = {
    aprovado: lotes.filter((lote) => lote.status_selo === 'aprovado').length,
    reprovado: lotes.filter((lote) => lote.status_selo === 'reprovado').length,
    em_analise: lotes.filter((lote) => lote.status_selo === 'em_analise').length,
  };
  const variedades = VARIEDADES.includes(form.variedade) ? VARIEDADES : [form.variedade, ...VARIEDADES];

  function openNew() {
    setForm(formFromLote(null));
    setEditorOpen(true);
  }

  function openEdit(lote) {
    setForm(formFromLote(lote));
    setEditorOpen(true);
  }

  function update(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'etapa_atual' && value === 'estoque' && !current.data_colheita) {
        next.data_colheita = toDatetimeLocal(new Date().toISOString());
      }
      return next;
    });
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    const payload = {
      codigo_lote: form.codigo_lote.trim(),
      nome: form.nome.trim(),
      variedade: form.variedade,
      etapa_atual: form.etapa_atual,
      data_inicio: form.data_inicio || null,
      data_colheita: form.data_colheita || null,
      data_fim: form.data_fim || null,
    };
    try {
      await api(form.id ? `/api/v1/lotes/${form.id}` : '/api/v1/lotes', {
        method: form.id ? 'PUT' : 'POST',
        token,
        body: form.id ? payload : { ...payload, device_id: DEVICE_ID },
      });
      setEditorOpen(false);
      onNotice(form.id ? 'Lote atualizado.' : 'Lote criado.');
      await onChanged();
    } catch (error) {
      onNotice(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  async function removeLote() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await api(`/api/v1/lotes/${pendingDelete.id_lote}`, { method: 'DELETE', token });
      setPendingDelete(null);
      onNotice('Lote excluído.');
      await onChanged();
    } catch (error) {
      onNotice(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  async function harvest() {
    if (!pendingHarvest) return;
    setBusy(true);
    try {
      await api(`/api/v1/lotes/${pendingHarvest.id_lote}/colher`, { method: 'POST', token });
      setPendingHarvest(null);
      onNotice(`Lote ${pendingHarvest.codigo_lote} colhido. O monitoramento segue na câmara fria.`);
      await onChanged();
    } catch (error) {
      onNotice(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="crud-main">
      <div className="crud-page-head">
        <div>
          <span className="eyebrow">Gestão de lotes</span>
          <h1>Lotes de manga</h1>
          <p>Cadastre, edite e acompanhe a certificação de cada lote.</p>
        </div>
        <div className="header-actions">
          <div className="stat-row">
            <span className="stat-chip approved">{counts.aprovado} com selo</span>
            <span className="stat-chip rejected">{counts.reprovado} reprovados</span>
            <span className="stat-chip pending">{counts.em_analise} em análise</span>
          </div>
          <button className="action-btn primary-btn" type="button" onClick={openNew}>Novo lote</button>
        </div>
      </div>

      <div className="crud-toolbar">
        <input className="crud-search" type="search" value={query} placeholder="Buscar por código, nome ou variedade" onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        <FieldSelect id="status-filter" value={status} onValueChange={(value) => { setStatus(value); setPage(1); }} options={[
          { value: 'todos', label: 'Todos os status' },
          { value: 'aprovado', label: 'Com selo' },
          { value: 'reprovado', label: 'Reprovados' },
          { value: 'em_analise', label: 'Em análise' },
        ]} />
        <FieldSelect id="etapa-filter" value={etapa} onValueChange={(value) => { setEtapa(value); setPage(1); }} options={[
          { value: 'todas', label: 'Todas as etapas' },
          { value: 'pomar', label: 'Pomar' },
          { value: 'estoque', label: 'Câmara fria' },
        ]} />
      </div>

      <div className="crud-table-wrap">
        <div className="table-scroll">
          <table className="crud-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Código</th>
                <th>Nome</th>
                <th className="col-optional">Etapa</th>
                <th className="col-optional">Pomar</th>
                <th className="col-optional">Câmara fria</th>
                <th>Selo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {slice.length ? slice.map((lote) => {
                const tone = sealTone(lote.status_selo);
                const pomar = lote.percentual_pomar == null ? null : Number(lote.percentual_pomar);
                const estoque = lote.percentual_estoque == null || Number(lote.percentual_estoque) === 0 ? null : Number(lote.percentual_estoque);
                return (
                  <tr key={lote.id_lote}>
                    <td><span className="id-num">{lote.id_lote}</span></td>
                    <td><span className="cod-mono">{lote.codigo_lote || '—'}</span></td>
                    <td>
                      <strong>{lote.nome || '—'}</strong>
                      <div className="lote-name-cell"><span className="variedade-tag">{lote.variedade || '—'}</span></div>
                    </td>
                    <td className="col-optional"><span className={lote.etapa_atual === 'pomar' ? 'etapa-pill pomar' : 'etapa-pill estoque'}>{lote.etapa_atual === 'pomar' ? 'Pomar' : 'Câmara fria'}</span></td>
                    <td className="col-optional"><span className={pomar === null ? 'pct-cell wait' : pomar >= 70 ? 'pct-cell ok' : 'pct-cell fail'}>{pomar === null ? '—' : `${pomar.toFixed(0)}%`}</span></td>
                    <td className="col-optional"><span className={estoque === null ? 'pct-cell wait' : estoque >= 70 ? 'pct-cell ok' : 'pct-cell fail'}>{estoque === null ? '—' : `${estoque.toFixed(0)}%`}</span></td>
                    <td><span className={`selo-badge-sm ${tone.tone}`}>{tone.compact}</span></td>
                    <td>
                      <div className="actions">
                        {lote.etapa_atual === 'pomar'
                          ? <button className="btn-colher" type="button" onClick={() => setPendingHarvest(lote)}>Colher</button>
                          : <span className="colhido-tag">Colhido</span>}
                        <button className="btn-edit" type="button" onClick={() => openEdit(lote)}>Editar</button>
                        <button className="btn-del" type="button" onClick={() => setPendingDelete(lote)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                );
              }) : <tr><td className="empty-row" colSpan={8}>Nenhum lote encontrado para os filtros selecionados.</td></tr>}
            </tbody>
          </table>
        </div>
        {filtered.length ? (
          <div className="crud-pagination">
            <span className="pagination-info">Exibindo {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} de {filtered.length}</span>
            <div className="pagination-btns">
              <button className="pg-btn" type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
              {Array.from({ length: pages }, (_, index) => (
                <button key={index + 1} className="pg-btn" type="button" data-current={index + 1 === currentPage} onClick={() => setPage(index + 1)}>{index + 1}</button>
              ))}
              <button className="pg-btn" type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Próxima</button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog.Root open={editorOpen} onOpenChange={setEditorOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <div className="dialog-head">
              <Dialog.Title>{form.id ? `Editar ${form.codigo_lote}` : 'Novo lote'}</Dialog.Title>
              <Dialog.Close className="modal-close" aria-label="Fechar">×</Dialog.Close>
            </div>
            <form onSubmit={save}>
              <div className="modal-form-grid">
                <div className="span2">
                  <Field id="cf-codigo" label="Código do lote">
                    <input id="cf-codigo" value={form.codigo_lote} required onChange={(event) => update('codigo_lote', event.target.value)} />
                  </Field>
                </div>
                <div className="span2">
                  <Field id="cf-nome" label="Nome">
                    <input id="cf-nome" value={form.nome} required onChange={(event) => update('nome', event.target.value)} />
                  </Field>
                </div>
                <FieldSelect id="cf-variedade" label="Variedade" value={form.variedade} onValueChange={(value) => update('variedade', value)} options={variedades.map((item) => ({ value: item, label: item }))} />
                <FieldSelect id="cf-etapa" label="Etapa atual" value={form.etapa_atual} onValueChange={(value) => update('etapa_atual', value)} options={[{ value: 'pomar', label: 'Pomar' }, { value: 'estoque', label: 'Câmara fria' }]} />
                <Field id="cf-inicio" label="Data de início">
                  <input id="cf-inicio" type="datetime-local" value={form.data_inicio} onChange={(event) => update('data_inicio', event.target.value)} />
                </Field>
                <Field id="cf-colheita" label="Data de colheita">
                  <input id="cf-colheita" type="datetime-local" value={form.data_colheita} onChange={(event) => update('data_colheita', event.target.value)} />
                </Field>
                <div className="span2">
                  <Field id="cf-fim" label="Data de encerramento">
                    <input id="cf-fim" type="datetime-local" value={form.data_fim} onChange={(event) => update('data_fim', event.target.value)} />
                  </Field>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-cancel-modal" type="button" onClick={() => setEditorOpen(false)}>Cancelar</button>
                <button className="btn-save-modal" type="submit" disabled={busy}>{busy ? 'Salvando…' : (form.id ? 'Salvar alterações' : 'Criar lote')}</button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        destructive
        title="Excluir este lote?"
        description={`O lote ${pendingDelete?.codigo_lote || ''} será removido. Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, excluir"
        busy={busy}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        onConfirm={removeLote}
      />
      <ConfirmDialog
        open={Boolean(pendingHarvest)}
        title="Confirmar colheita?"
        description={`O lote ${pendingHarvest?.codigo_lote || ''} vai para a câmara fria e as novas leituras entram na etapa 2.`}
        confirmLabel="Colher lote"
        busy={busy}
        onOpenChange={(open) => { if (!open) setPendingHarvest(null); }}
        onConfirm={harvest}
      />
    </main>
  );
}
