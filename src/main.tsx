import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'animal-island-ui/style'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
