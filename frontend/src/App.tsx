import React, { useState } from 'react';
import { AppLayout } from './layouts/AppLayout';
import { Overview } from './pages/Overview';
import { MyEnvironments } from './pages/MyEnvironments';
import { CreateEnvironment } from './pages/CreateEnvironment';
import { TerminalView } from './pages/TerminalView';
import { FileManagerView } from './pages/FileManagerView';
import { MonitoringView } from './pages/MonitoringView';
import { ImagesView } from './pages/ImagesView';
import { VolumesView } from './pages/VolumesView';
import { NetworksView } from './pages/NetworksView';
import { ActivityView } from './pages/ActivityView';
import { SettingsView } from './pages/SettingsView';

export function App() {
  const [currentTab, setCurrentTab] = useState('overview');
  const [focusedEnvId, setFocusedEnvId] = useState<number | undefined>(undefined);

  const handleNavigate = (tab: string, envId?: number) => {
    if (envId !== undefined) {
      setFocusedEnvId(envId);
    }
    setCurrentTab(tab);
  };

  return (
    <AppLayout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {currentTab === 'overview' && <Overview onNavigate={handleNavigate} />}
      {currentTab === 'environments' && <MyEnvironments onNavigate={handleNavigate} />}
      {currentTab === 'create' && (
        <CreateEnvironment
          onSuccess={(id) => handleNavigate('terminal', id)}
          onCancel={() => handleNavigate('environments')}
        />
      )}
      {currentTab === 'terminal' && (
        <TerminalView initialEnvId={focusedEnvId} onNavigate={handleNavigate} />
      )}
      {currentTab === 'files' && (
        <FileManagerView initialEnvId={focusedEnvId} onNavigate={handleNavigate} />
      )}
      {currentTab === 'monitoring' && <MonitoringView />}
      {currentTab === 'images' && <ImagesView />}
      {currentTab === 'volumes' && <VolumesView />}
      {currentTab === 'networks' && <NetworksView />}
      {currentTab === 'activity' && <ActivityView />}
      {currentTab === 'settings' && <SettingsView />}
    </AppLayout>
  );
}

export default App;
