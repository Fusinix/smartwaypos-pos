import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wifi, 
  WifiOff, 
  Clock, 
  AlertTriangle,
  RefreshCw 
} from 'lucide-react';

interface OfflineStatusProps {
  licenseInfo: any;
  onRefreshLicense: () => void;
}

export const OfflineStatus: React.FC<OfflineStatusProps> = ({ 
  licenseInfo, 
  onRefreshLicense 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineDays, setOfflineDays] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check offline status
    checkOfflineStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkOfflineStatus = async () => {
    try {
      const lastCheck = await window.electron.invoke('get-last-online-check');
      if (lastCheck) {
        const daysSince = (Date.now() - lastCheck) / (1000 * 60 * 60 * 24);
        setOfflineDays(Math.floor(daysSince));
        setShowWarning(daysSince > 25); // Show warning after 25 days
      }
    } catch (error) {
      console.error('Failed to check offline status:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      await onRefreshLicense();
      await checkOfflineStatus();
    } catch (error) {
      console.error('Failed to refresh license:', error);
    }
  };

  if (!licenseInfo) return null;

  return (
    <div className="space-y-2">
      {/* Online/Offline Status */}
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <Wifi className="h-3 w-3 mr-1" />
            Online
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <WifiOff className="h-3 w-3 mr-1" />
            Offline
          </Badge>
        )}
        
        {offlineDays !== null && offlineDays > 0 && (
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {offlineDays} days offline
          </Badge>
        )}
      </div>

      {/* License Info */}
      <div className="text-xs text-gray-600">
        <div>License: {licenseInfo.licenseKey.substring(0, 8)}...</div>
        <div>Features: {licenseInfo.features.join(', ')}</div>
        {licenseInfo.expiryDate && (
          <div>Expires: {new Date(licenseInfo.expiryDate).toLocaleDateString()}</div>
        )}
      </div>

      {/* Offline Warning */}
      {showWarning && (
        <Alert variant="destructive" className="text-xs">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You've been offline for {offlineDays} days. 
            Please connect to the internet soon to validate your license.
          </AlertDescription>
        </Alert>
      )}

      {/* Refresh Button */}
      {isOnline && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh License
        </Button>
      )}
    </div>
  );
}; 