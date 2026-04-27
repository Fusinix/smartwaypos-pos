import React, { useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from "sonner";
import { Layout } from './components/layout/Layout';
import { FullPageLoader } from './components/ui/full-page-loader';
import { AuthProvider } from './context/AuthContext';
import { KeyboardProvider } from './context/KeyboardContext';
import { Login } from './pages/Login';
import { useAlertStore } from './stores/useAlertStore';
import { LicenseCheck } from './components/LicenseCheck';
import { useOnScreenKeyboard } from './hooks/useOnScreenKeyboard';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Products = React.lazy(() => import('./pages/Products'));
const Food = React.lazy(() => import('./pages/Food'));
const Orders = React.lazy(() => import('./pages/Orders'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Profile = React.lazy(() => import('./pages/Profile'));
const SuperAdmin = React.lazy(() => import('./pages/SuperAdmin'));
const CreateOrder = React.lazy(() => import('./pages/CreateOrder'));

import { SideKeyboard } from './components/keyboard/SideKeyboard';
import { useKeyboard } from './context/KeyboardContext';

/** Thin wrapper so useOnScreenKeyboard runs inside AuthProvider */
const KeyboardListener: React.FC = () => {
  useOnScreenKeyboard();
  return null;
};

/** Main app content wrapper to handle global keyboard shifting */
const AppContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOpen, portalContainer } = useKeyboard();
  
  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('keyboard-open');
    } else {
      document.body.classList.remove('keyboard-open');
    }
  }, [isOpen]);

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden w-full relative">
      <div 
        ref={portalContainer}
        className="flex-1 flex transition-all duration-300 ease-in-out w-full overflow-hidden relative"
      >
        {children}
      </div>
      <SideKeyboard />
    </div>
  );
};

const App: React.FC = () => {
  const { isLoading, loadingMessage } = useAlertStore();
  const [licenseInfo, setLicenseInfo] = useState<any>(null);

  const handleLicenseValid = (info: any) => {
    setLicenseInfo(info);
  };

  return (
    <KeyboardProvider>
      <Toaster position="top-center" richColors />
      {isLoading && <FullPageLoader message={loadingMessage} />}
      <LicenseCheck onLicenseValid={handleLicenseValid}>
        <HashRouter>
          <AuthProvider>
            <KeyboardListener />
            <AppContent>
              <React.Suspense fallback={<FullPageLoader />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/super-admin" element={<SuperAdmin />} />
                  <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/food" element={<Food />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/create-order" element={<CreateOrder />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/profile" element={<Profile />} />
                  </Route>
                </Routes>
              </React.Suspense>
            </AppContent>
          </AuthProvider>
        </HashRouter>
      </LicenseCheck>
    </KeyboardProvider>
  );
};

export default App;
