import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import Brand from './Brand.jsx';
import ChatWidget from './ChatWidget.jsx';
import DashboardView from './DashboardView.jsx';
import InstallButton from './InstallButton.jsx';
import LotesView from './LotesView.jsx';
import { useNotice } from './Notice.jsx';
import { forwardUsbReading, useSerial } from '../hooks/useSerial.js';
import { useDashboard } from '../hooks/useDashboard.js';

export default function AppShell({ token, onLogout }) {
  const [screen, setScreen] = useState('dashboard');
  const notify = useNotice();
  const dashboard = useDashboard(token, screen, onLogout);
  const serial = useSerial(async (reading) => {
    dashboard.showUsbReading(reading);
    try {
      await forwardUsbReading(reading);
    } catch (error) {
      notify(error.message || 'A leitura chegou pelo cabo, mas não foi gravada na API.', true);
    }
  });

  async function changeStage(lote, nextStage) {
    try {
      await dashboard.changeStage(lote, nextStage);
    } catch (error) {
      if (error.status !== 401) notify(error.message, true);
    }
  }

  const connectionClass = dashboard.connection === 'offline' ? 'offline' : dashboard.connection === 'usb' ? 'usb' : '';
  const connectionLabel = dashboard.connection === 'usb' ? 'USB conectada' : dashboard.connection === 'offline' ? 'Sem conexão' : 'Conectado';

  return (
    <Tabs.Root className="app-view" value={screen} onValueChange={setScreen}>
      <header className="topbar">
        <div className="topbar-inner">
          <Brand />
          <Tabs.List className="header-nav" aria-label="Navegação">
            <Tabs.Trigger className="nav-tab" value="dashboard">Painel</Tabs.Trigger>
            <Tabs.Trigger className="nav-tab" value="lotes">Gestão de lotes</Tabs.Trigger>
          </Tabs.List>
          <div className="top-actions">
            <button className="action-btn usb-btn" type="button" data-connected={serial.connected} onClick={serial.connect}>
              {serial.connected ? 'USB conectada' : 'Conectar cabo USB'}
            </button>
            <InstallButton />
            <span className={`connection-pill ${connectionClass}`}>
              <i className="connection-dot" />
              <span>{connectionLabel}</span>
            </span>
            <button className="text-button" type="button" onClick={onLogout}>Sair</button>
          </div>
        </div>
      </header>
      {serial.error ? <p className="notice error" role="alert">{serial.error}</p> : null}
      <Tabs.Content value="dashboard">
        <DashboardView
          reading={dashboard.latest}
          readings={dashboard.readings}
          deviceAssigned={dashboard.deviceAssigned}
          connection={dashboard.connection}
          notice={dashboard.notice}
          metric={dashboard.metric}
          onMetric={dashboard.setMetric}
          onRefresh={() => { dashboard.refresh(); dashboard.recalculate(); }}
          lotes={dashboard.lotes}
          counts={dashboard.counts}
          filter={dashboard.filter}
          onFilter={dashboard.setFilter}
          selectedId={dashboard.selectedId}
          onSelect={dashboard.setSelectedId}
          audit={dashboard.audit}
          onRecalculate={dashboard.recalculate}
          onChangeStage={changeStage}
        />
      </Tabs.Content>
      <Tabs.Content value="lotes">
        <LotesView
          token={token}
          lotes={dashboard.allLotes}
          onChanged={async () => {
            await dashboard.reloadLotes();
            dashboard.bump();
          }}
          onNotice={notify}
        />
      </Tabs.Content>
      <ChatWidget token={token} />
    </Tabs.Root>
  );
}
