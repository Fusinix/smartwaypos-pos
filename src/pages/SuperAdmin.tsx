import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Key, Calendar, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface LicenseInfo {
  licenseKey: string;
  hardwareId: string;
  issuedDate: string;
  expiryDate?: string;
  subscriptionEndDate?: string;
  status?: 'active' | 'expired' | 'suspended';
  lastValidated?: string;
}

export const SuperAdmin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [hardwareId, setHardwareId] = useState('');
  const [lastOnlineCheck, setLastOnlineCheck] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Get hardware ID on mount
    window.electron.invoke('get-hardware-id').then(setHardwareId).catch(console.error);
    window.electron.invoke('get-last-online-check').then(setLastOnlineCheck).catch(console.error);
  }, []);

  const handleLogin = async () => {
    if (!username || !password || !licenseKey) {
      setError('Please enter username, password, and license key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate admin credentials and license key with server
      const result = await window.electron.invoke('super-admin-login', {
        username,
        password,
        licenseKey,
      });

      if (result.success) {
        setIsAuthenticated(true);
        await loadLicenseInfo();
      } else {
        setError(result.message || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadLicenseInfo = async () => {
    try {
      const info = await window.electron.invoke('get-license-info');
      setLicenseInfo(info);
    } catch (err) {
      console.error('Failed to load license info:', err);
    }
  };

  const handleSyncWithServer = async () => {
    if (!licenseInfo) return;

    setSyncing(true);
    setError(null);

    try {
      const result = await window.electron.invoke('force-license-validation', licenseInfo.licenseKey);
      
      if (result.valid) {
        await loadLicenseInfo();
        const lastCheck = await window.electron.invoke('get-last-online-check');
        setLastOnlineCheck(lastCheck);
      } else {
        setError(result.message || 'Failed to sync with server');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync with server. Please check your internet connection.');
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const formatDaysAgo = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Super Admin Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="username">Admin Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className="mt-1"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <div>
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="mt-1"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <div>
              <Label htmlFor="license-key">License Key</Label>
              <Input
                id="license-key"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Enter device license key"
                className="mt-1"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleLogin}
              disabled={loading || !username || !password || !licenseKey}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Login'
              )}
            </Button>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This page requires internet connection to authenticate with the license server.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Super Admin Dashboard
          </h1>
          <Button
            variant="outline"
            onClick={() => setIsAuthenticated(false)}
          >
            Logout
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              License Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {licenseInfo ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">License Key</Label>
                    <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                      {licenseInfo.licenseKey}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Hardware ID</Label>
                    <p className="text-sm font-mono bg-gray-100 p-2 rounded truncate">
                      {hardwareId}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {licenseInfo.status === 'active' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm capitalize">{licenseInfo.status || 'Unknown'}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Issued Date</Label>
                    <p className="text-sm">{formatDate(licenseInfo.issuedDate)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Subscription End Date</Label>
                    <p className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(licenseInfo.subscriptionEndDate || licenseInfo.expiryDate)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Last Online Check</Label>
                    <p className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {formatDaysAgo(lastOnlineCheck)}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={handleSyncWithServer}
                    disabled={syncing}
                    className="w-full"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync with Server
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-gray-500">No license information available</p>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> Use "Sync with Server" to manually check for subscription updates from the license server.
            This will update the subscription end date if it has been extended remotely.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default SuperAdmin;

