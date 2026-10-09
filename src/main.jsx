import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme.css';
import './index.css';
import App from './App.jsx';
import { UnlockProvider } from './hostel/UnlockContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UnlockProvider>
      <App />
    </UnlockProvider>
  </StrictMode>
);
