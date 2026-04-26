import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/providers/AppProviders';
import { WorkspaceApp } from './modules/workspace/WorkspaceApp';
import './shared/styles/global.css';
import {
  applyAppearanceMode,
  applyThemeColor,
  readStoredAppearanceMode,
  readStoredThemeColor,
} from './shared/theme/themeColor';

applyThemeColor(readStoredThemeColor());
applyAppearanceMode(readStoredAppearanceMode());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <WorkspaceApp />
    </AppProviders>
  </StrictMode>,
);
