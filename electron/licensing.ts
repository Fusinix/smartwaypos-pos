import { app } from 'electron';
import * as crypto from 'crypto';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

interface LicenseInfo {
  licenseKey: string;
  hardwareId: string;
  issuedDate: string;
  expiryDate?: string;
  maxUsers?: number;
  features: string[];
  signature: string;
}

interface HardwareFingerprint {
  hostname: string;
  platform: string;
  arch: string;
  cpus: number;
  totalMem: number;
  networkInterfaces: string[];
  machineId: string;
}

class LicensingManager {
  private licenseFile: string;
  private hardwareId: string;
  private licenseInfo: LicenseInfo | null = null;
  private readonly SECRET_KEY = 'your-secret-key-here'; // Change this!
  
  // Offline configuration
  private readonly OFFLINE_GRACE_PERIOD_DAYS = 30; // Days license can work offline
  private readonly REQUIRE_ONLINE_ACTIVATION = true; // Must activate online first
  private readonly OFFLINE_VALIDATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly PERIODIC_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Check every 24 hours when online
  private licenseServerUrl: string = process.env.LICENSE_SERVER_URL || '';

  constructor() {
    this.licenseFile = path.join(app.getPath('userData'), 'license.json');
    this.hardwareId = this.generateHardwareFingerprint();
  }

  private generateHardwareFingerprint(): string {
    // Only use truly stable identifiers to avoid license resets on network changes
    const fingerprint = {
      machineId: this.getMachineId(),
      arch: os.arch(),
      cpus: os.cpus().length,
      platform: os.platform()
    };

    return crypto.createHash('sha256')
      .update(JSON.stringify(fingerprint))
      .digest('hex');
  }

  private getMachineId(): string {
    // Get machine-specific identifiers
    const platform = os.platform();
    
    if (platform === 'darwin') {
      // macOS
      try {
        const { execSync } = require('child_process');
        return execSync('ioreg -l | grep IOPlatformSerialNumber').toString().split('"')[3];
      } catch {
        return os.hostname();
      }
    } else if (platform === 'win32') {
      // Windows
      try {
        const { execSync } = require('child_process');
        return execSync('wmic csproduct get uuid').toString().split('\n')[1].trim();
      } catch {
        return os.hostname();
      }
    } else {
      // Linux
      try {
        const { execSync } = require('child_process');
        return execSync('cat /etc/machine-id').toString().trim();
      } catch {
        return os.hostname();
      }
    }
  }

  private signLicense(licenseData: Omit<LicenseInfo, 'signature'>): string {
    const dataToSign = JSON.stringify({
      licenseKey: licenseData.licenseKey,
      hardwareId: licenseData.hardwareId,
      issuedDate: licenseData.issuedDate,
      expiryDate: licenseData.expiryDate,
      maxUsers: licenseData.maxUsers,
      features: licenseData.features
    });

    return crypto.createHmac('sha256', this.SECRET_KEY)
      .update(dataToSign)
      .digest('hex');
  }

  private verifyLicenseSignature(licenseInfo: LicenseInfo): boolean {
    const expectedSignature = this.signLicense(licenseInfo);
    return licenseInfo.signature === expectedSignature;
  }

  async validateLicense(licenseKey: string): Promise<{ valid: boolean; message: string; licenseInfo?: LicenseInfo }> {
    try {
      // First, try online validation
      const onlineResult = await this.validateOnline(licenseKey);
      if (onlineResult.valid) {
        return onlineResult;
      }

      // Fallback to offline validation
      return this.validateOffline(licenseKey);
    } catch (error:any) {
      console.error('License validation error:', error);
      // For testing, if no license server is configured, try offline validation
      if (error.message?.includes('No license server configured') || error.message?.includes('ENOTFOUND')) {
        console.log('No license server available, using offline validation');
        return this.validateOffline(licenseKey);
      }
      return { valid: false, message: 'License validation failed' };
    }
  }

  private async validateOnline(licenseKey: string): Promise<{ valid: boolean; message: string; licenseInfo?: LicenseInfo }> {
    try {
      // Use the live Smartway Portal URL
      const licenseServerUrl = process.env.LICENSE_SERVER_URL || 'https://smartwaypos.vercel.app/api/validate';
      
      // Allow localhost for development
      const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
      const activeUrl = isDev ? 'http://localhost:3000/api/validate' : licenseServerUrl;

      const response = await fetch(activeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: licenseKey,
          device_id: this.hardwareId,
          appVersion: app.getVersion(),
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.valid) {
        // Update last online check
        await this.updateLastOnlineCheck();
        
        // If the server didn't wrap info in licenseInfo, build it from top-level fields
        const infoToSave = result.licenseInfo || {
          licenseKey: licenseKey,
          hardwareId: this.hardwareId,
          expiryDate: result.expires_at || result.expiry_date,
          isLifetime: result.is_lifetime || false,
          activatedAt: new Date().toISOString()
        };

        // Ensure we have a signature (or generate a local one for offline verification)
        if (!infoToSave.signature) {
          infoToSave.signature = this.signLicense(infoToSave);
        }
        
        await this.saveLicense(infoToSave);
        return { ...result, licenseInfo: infoToSave };
      }

      return { valid: false, message: result.message || 'Invalid license' };
    } catch (error: any) {
      console.log('Online validation failed:', error.message);
      throw error;
    }
  }

  private isLicenseServerConfigured(serverUrl: string): boolean {
    // Check if a real license server URL is configured
    return !serverUrl.includes('your-license-server.com') && serverUrl.startsWith('http');
  }

  private validateOffline(licenseKey: string): { valid: boolean; message: string; licenseInfo?: LicenseInfo } {
    try {
      console.log('--- Offline Validation Debug ---');
      console.log('Checking for license file at:', this.licenseFile);
      
      // Load saved license
      const savedLicense = this.loadLicense();
      if (!savedLicense) {
        console.log('Result: No license file found');
        return { valid: false, message: 'No license found. Internet required for initial activation.' };
      }

      console.log('Saved License found for key:', savedLicense.licenseKey);
      console.log('Current Hardware ID:', this.hardwareId);
      console.log('Stored Hardware ID:', savedLicense.hardwareId);

      // Verify hardware ID (allow test hardware ID for development)
      if (savedLicense.hardwareId !== this.hardwareId && savedLicense.hardwareId !== 'test-hardware-id') {
        console.log('Result: Hardware ID mismatch');
        return { valid: false, message: 'License not valid for this machine' };
      }

      // Verify license key
      if (savedLicense.licenseKey !== licenseKey) {
        console.log('Result: License key mismatch');
        return { valid: false, message: 'Invalid license key' };
      }

      // Verify signature
      if (!this.verifyLicenseSignature(savedLicense)) {
        console.log('Result: Signature invalid');
        return { valid: false, message: 'License signature invalid' };
      }

      // Check expiry
      if (savedLicense.expiryDate) {
        const expiryDate = new Date(savedLicense.expiryDate);
        if (expiryDate < new Date()) {
          console.log('Result: License expired');
          return { valid: false, message: 'License expired' };
        }
      }

      console.log('Result: VALID (Offline)');
      return { valid: true, message: 'License valid (offline mode)', licenseInfo: savedLicense };
    } catch (error) {
      console.error('Offline validation error:', error);
      return { valid: false, message: 'License validation failed' };
    }
  }

  private isOfflineGracePeriodExpired(license: LicenseInfo): boolean {
    try {
      const lastOnlineCheck = this.getLastOnlineCheck();
      if (!lastOnlineCheck) {
        return false; // First time offline, allow grace period
      }

      const daysSinceLastCheck = (Date.now() - lastOnlineCheck) / (1000 * 60 * 60 * 24);
      return daysSinceLastCheck > this.OFFLINE_GRACE_PERIOD_DAYS;
    } catch {
      return false;
    }
  }

  private getLastOnlineCheck(): number | null {
    try {
      const checkFile = path.join(app.getPath('userData'), 'last-online-check.json');
      if (fs.existsSync(checkFile)) {
        const data = fs.readFileSync(checkFile, 'utf8');
        const check = JSON.parse(data);
        return check.timestamp;
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  private async updateLastOnlineCheck(): Promise<void> {
    try {
      const checkFile = path.join(app.getPath('userData'), 'last-online-check.json');
      const data = { timestamp: Date.now() };
      await fs.promises.writeFile(checkFile, JSON.stringify(data, null, 2));
    } catch {
      // Ignore errors
    }
  }

  private async saveLicense(licenseInfo: LicenseInfo): Promise<void> {
    try {
      console.log('--- Saving License ---');
      console.log('Target path:', this.licenseFile);
      await fs.promises.writeFile(this.licenseFile, JSON.stringify(licenseInfo, null, 2));
      console.log('License saved successfully.');
      this.licenseInfo = licenseInfo;
    } catch (error) {
      console.error('Failed to save license:', error);
    }
  }

  private loadLicense(): LicenseInfo | null {
    try {
      console.log('--- Loading License ---');
      console.log('Attempting to load from:', this.licenseFile);
      if (fs.existsSync(this.licenseFile)) {
        const data = fs.readFileSync(this.licenseFile, 'utf8');
        console.log('File found. Data length:', data.length);
        return JSON.parse(data);
      }
      console.log('File NOT found.');
    } catch (error) {
      console.error('Failed to load license:', error);
    }
    return null;
  }

  async checkLicense(): Promise<{ valid: boolean; message: string }> {
    const savedLicense = this.loadLicense();
    if (!savedLicense) {
      return { valid: false, message: 'No license found' };
    }

    return this.validateOffline(savedLicense.licenseKey);
  }

  getLicenseInfo(): LicenseInfo | null {
    return this.licenseInfo;
  }

  getHardwareId(): string {
    return this.hardwareId;
  }

  // Set license server URL (can be called from main process)
  setLicenseServerUrl(url: string): void {
    this.licenseServerUrl = url;
  }

  getLicenseServerUrl(): string {
    return this.licenseServerUrl;
  }

  // Force online validation (for super admin or manual checks)
  async forceOnlineValidation(licenseKey: string): Promise<{ valid: boolean; message: string; licenseInfo?: LicenseInfo }> {
    try {
      return await this.validateOnline(licenseKey);
    } catch (error: any) {
      return { valid: false, message: `Online validation failed: ${error.message}` };
    }
  }

  // Check if license is valid for critical operations
  async isLicenseValidForOperation(): Promise<{ valid: boolean; message: string }> {
    const savedLicense = this.loadLicense();
    if (!savedLicense) {
      return { valid: false, message: 'No license found' };
    }

    // Try online validation first if possible
    try {
      if (this.isLicenseServerConfigured(this.licenseServerUrl)) {
        const onlineResult = await this.validateOnline(savedLicense.licenseKey);
        if (onlineResult.valid) {
          return { valid: true, message: 'License valid' };
        }
      }
    } catch {
      // Fall through to offline validation
    }

    // Fallback to offline validation
    const offlineResult = this.validateOffline(savedLicense.licenseKey);
    return { valid: offlineResult.valid, message: offlineResult.message };
  }

  // Anti-tampering measures
  private detectTampering(): boolean {
    try {
      // Check if app has been modified
      const appPath = app.getAppPath();
      const packageJson = path.join(appPath, 'package.json');
      
      if (fs.existsSync(packageJson)) {
        const stats = fs.statSync(packageJson);
        // Add more sophisticated checks here
        return false;
      }
      
      return true;
    } catch {
      return true;
    }
  }
}

export const licensingManager = new LicensingManager(); 