import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AppErrorBoundary } from './components/auth/AppErrorBoundary'

const root = document.getElementById("root");
if (root) createRoot(root).render(<AppErrorBoundary><App /></AppErrorBoundary>);
