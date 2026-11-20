import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { SettingsProvider } from './hooks/useSettings.jsx'
import { PlayerProvider } from './hooks/usePlayer.jsx'
import './styles/global.css'
import './styles/forecast.css'
import './styles/animations.css'

createRoot(document.getElementById('root')).render(
  <SettingsProvider>
    <PlayerProvider>
      <App />
    </PlayerProvider>
  </SettingsProvider>,
)
