import React, { useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from "sonner";
import { Layout } from './components/layout/Layout';
import { FullPageLoader } from './components/ui/full-page-loader';
import { AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import { useAlertStore } from './stores/useAlertStore';
import { LicenseCheck } from './components/LicenseCheck';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Products = React.lazy(() => import('./pages/Products'));
const Food = React.lazy(() => import('./pages/Food'));
const FoodExtras = React.lazy(() => import('./pages/FoodExtras'));
const Categories = React.lazy(() => import('./pages/Categories'));
const Orders = React.lazy(() => import('./pages/Orders'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Profile = React.lazy(() => import('./pages/Profile'));
const SuperAdmin = React.lazy(() => import('./pages/SuperAdmin'));

const App: React.FC = () => {
  const { isLoading,loadingMessage } = useAlertStore();
  const [licenseInfo, setLicenseInfo] = useState<any>(null);

  const handleLicenseValid = (info: any) => {
    setLicenseInfo(info);
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      {isLoading && <FullPageLoader message={loadingMessage} />}
      <LicenseCheck onLicenseValid={handleLicenseValid}>
        <HashRouter>
          <AuthProvider>
            <React.Suspense fallback={<FullPageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/super-admin" element={<SuperAdmin />} />
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/food" element={<Food />} />
                  <Route path="/food-extras" element={<FoodExtras />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/categories" element={<Categories />} />
                </Route>
              </Routes>
            </React.Suspense>
          </AuthProvider>
        </HashRouter>
      </LicenseCheck>
    </>
  );
};

export default App;
