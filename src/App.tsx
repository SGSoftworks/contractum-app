import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layouts/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { RegisterCompany } from './pages/RegisterCompany';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { ContractsList } from './pages/ContractsList';
import { CreateContract } from './pages/CreateContract';
import { ContractDetail } from './pages/ContractDetail';
import { Audit } from './pages/Audit';
import { Blockchain } from './pages/Blockchain';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { useAuthStore } from './store/authStore';

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register-company" element={<RegisterCompany />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="contracts" element={<ContractsList />} />
            <Route path="contracts/new" element={<CreateContract />} />
            <Route path="contracts/:id" element={<ContractDetail />} />
            <Route path="audit" element={<Audit />} />
            <Route path="blockchain" element={<Blockchain />} />
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
