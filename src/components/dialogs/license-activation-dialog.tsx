import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, Shield, AlertTriangle } from 'lucide-react';

interface LicenseActivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLicenseActivated: (licenseInfo: any) => void;
  hardwareId: string;
}

export const LicenseActivationDialog: React.FC<LicenseActivationDialogProps> = ({
  open,
  onOpenChange,
  onLicenseActivated,
  hardwareId,
}) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter a license key');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.electron.invoke('activate-license', licenseKey);
      
      if (result.valid) {
        setSuccess('License activated successfully!');
        setTimeout(() => {
          onLicenseActivated(result.licenseInfo);
          onOpenChange(false);
        }, 1500);
      } else {
        setError(result.message || 'License activation failed');
      }
    } catch (err) {
      setError('Failed to activate license. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleActivate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Activate License
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="license-key">License Key</Label>
            <Input
              id="license-key"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your license key"
              className="mt-1"
              disabled={loading}
            />
          </div>

          <Alert className='w-full'>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              This license is bound to this machine. The hardware ID is: <br />
              <code className="text-xs bg-muted px-1 py-0.5 rounded line-clamp-1 truncate">
                {hardwareId}
              </code>
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleActivate}
              disabled={loading || !licenseKey.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                'Activate License'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 