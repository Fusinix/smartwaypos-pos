import React, { useEffect, useState } from 'react';
import { LicenseActivationDialog } from './dialogs/license-activation-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

interface LicenseCheckProps {
  children: React.ReactNode;
  onLicenseValid: (licenseInfo: any) => void;
}

export const LicenseCheck: React.FC<LicenseCheckProps> = ({ children, onLicenseValid }) => {
  const [loading, setLoading] = useState(true);
  const [licenseValid, setLicenseValid] = useState(false);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [hardwareId, setHardwareId] = useState('');
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get hardware ID
      const hwId = await window.electron.invoke('get-hardware-id');
      setHardwareId(hwId);

      // Check if license exists and is valid
      const result = await window.electron.invoke('check-license');
      
      if (result.valid) {
        const info = await window.electron.invoke('get-license-info');
        setLicenseInfo(info);
        setLicenseValid(true);
        onLicenseValid(info);
      } else {
        setLicenseValid(false);
        setShowActivationDialog(true);
      }
    } catch (err) {
      console.error('License check failed:', err);
      setError('Failed to check license. Please try again.');
      setLicenseValid(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseActivated = (info: any) => {
    setLicenseInfo(info);
    setLicenseValid(true);
    onLicenseValid(info);
    setShowActivationDialog(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Checking license...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={checkLicense} 
            className="mt-4 w-full"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!licenseValid) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">License Required</h2>
            <p className="text-gray-600 mb-4">
              This application requires a valid license to run. Please activate your license to continue.
            </p>
            <Button 
              onClick={() => setShowActivationDialog(true)}
              className="w-full"
            >
              Activate License
            </Button>
          </div>
        </div>

        <LicenseActivationDialog
          open={showActivationDialog}
          onOpenChange={setShowActivationDialog}
          onLicenseActivated={handleLicenseActivated}
          hardwareId={hardwareId}
        />
      </>
    );
  }

  return (
    <>
      {children}
      
      <LicenseActivationDialog
        open={showActivationDialog}
        onOpenChange={setShowActivationDialog}
        onLicenseActivated={handleLicenseActivated}
        hardwareId={hardwareId}
      />
    </>
  );
}; 