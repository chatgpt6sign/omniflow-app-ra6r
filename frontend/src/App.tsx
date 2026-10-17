import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Index from './pages/Index';

const App = () => (
  <HashRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </HashRouter>
);

export default App;
