import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layouts/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Landing } from './pages/Landing';
import { Terms } from './pages/Terms';
import { Login } from './pages/Login';
import { RegisterCompany } from './pages/RegisterCompany';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { ContractsList } from './pages/ContractsList';
import { ContractDetail } from './pages/ContractDetail';
import { CreateContract } from './pages/CreateContract';
import { SignerView } from './pages/SignerView';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';

function App() {
  const setSession = useAuthStore((state) => state.setSession);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setLoading(true);
        await fetchProfile(session.user.id);
      }

      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/" element={<Landing />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register-company" element={<RegisterCompany />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/view-contract/:id" element={<SignerView />} />
        
        {/* Rutas Protegidas de la Aplicación */}
        <Route path="/app" element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="contracts" element={<ContractsList />} />
            <Route path="contracts/new" element={<CreateContract />} />
            <Route path="contracts/:id" element={<ContractDetail />} />
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
