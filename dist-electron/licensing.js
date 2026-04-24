"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.licensingManager = void 0;
const electron_1 = require("electron");
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class LicensingManager {
    constructor() {
        this.licenseInfo = null;
        this.SECRET_KEY = 'your-secret-key-here'; // Change this!
        // Offline configuration
        this.OFFLINE_GRACE_PERIOD_DAYS = 30; // Days license can work offline
        this.REQUIRE_ONLINE_ACTIVATION = true; // Must activate online first
        this.OFFLINE_VALIDATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
        this.PERIODIC_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Check every 24 hours when online
        this.licenseServerUrl = process.env.LICENSE_SERVER_URL || '';
        this.licenseFile = path.join(electron_1.app.getPath('userData'), 'license.json');
        this.hardwareId = this.generateHardwareFingerprint();
    }
    generateHardwareFingerprint() {
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
    getMachineId() {
        // Get machine-specific identifiers
        const platform = os.platform();
        if (platform === 'darwin') {
            // macOS
            try {
                const { execSync } = require('child_process');
                return execSync('ioreg -l | grep IOPlatformSerialNumber').toString().split('"')[3];
            }
            catch {
                return os.hostname();
            }
        }
        else if (platform === 'win32') {
            // Windows
            try {
                const { execSync } = require('child_process');
                return execSync('wmic csproduct get uuid').toString().split('\n')[1].trim();
            }
            catch {
                return os.hostname();
            }
        }
        else {
            // Linux
            try {
                const { execSync } = require('child_process');
                return execSync('cat /etc/machine-id').toString().trim();
            }
            catch {
                return os.hostname();
            }
        }
    }
    signLicense(licenseData) {
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
    verifyLicenseSignature(licenseInfo) {
        const expectedSignature = this.signLicense(licenseInfo);
        return licenseInfo.signature === expectedSignature;
    }
    async validateLicense(licenseKey) {
        try {
            // First, try online validation
            const onlineResult = await this.validateOnline(licenseKey);
            if (onlineResult.valid) {
                return onlineResult;
            }
            // Fallback to offline validation
            return this.validateOffline(licenseKey);
        }
        catch (error) {
            console.error('License validation error:', error);
            // For testing, if no license server is configured, try offline validation
            if (error.message?.includes('No license server configured') || error.message?.includes('ENOTFOUND')) {
                console.log('No license server available, using offline validation');
                return this.validateOffline(licenseKey);
            }
            return { valid: false, message: 'License validation failed' };
        }
    }
    async validateOnline(licenseKey) {
        try {
            // Use the live Smartway Portal URL
            const licenseServerUrl = process.env.LICENSE_SERVER_URL || 'https://smartwaypos.vercel.app/api/validate';
            // Allow localhost for development
            const isDev = !electron_1.app.isPackaged || process.env.NODE_ENV === 'development';
            const activeUrl = isDev ? 'http://localhost:3000/api/validate' : licenseServerUrl;
            const response = await fetch(activeUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    license_key: licenseKey,
                    device_id: this.hardwareId,
                    appVersion: electron_1.app.getVersion(),
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
        }
        catch (error) {
            console.log('Online validation failed:', error.message);
            throw error;
        }
    }
    isLicenseServerConfigured(serverUrl) {
        // Check if a real license server URL is configured
        return !serverUrl.includes('your-license-server.com') && serverUrl.startsWith('http');
    }
    validateOffline(licenseKey) {
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
        }
        catch (error) {
            console.error('Offline validation error:', error);
            return { valid: false, message: 'License validation failed' };
        }
    }
    isOfflineGracePeriodExpired(license) {
        try {
            const lastOnlineCheck = this.getLastOnlineCheck();
            if (!lastOnlineCheck) {
                return false; // First time offline, allow grace period
            }
            const daysSinceLastCheck = (Date.now() - lastOnlineCheck) / (1000 * 60 * 60 * 24);
            return daysSinceLastCheck > this.OFFLINE_GRACE_PERIOD_DAYS;
        }
        catch {
            return false;
        }
    }
    getLastOnlineCheck() {
        try {
            const checkFile = path.join(electron_1.app.getPath('userData'), 'last-online-check.json');
            if (fs.existsSync(checkFile)) {
                const data = fs.readFileSync(checkFile, 'utf8');
                const check = JSON.parse(data);
                return check.timestamp;
            }
        }
        catch {
            // Ignore errors
        }
        return null;
    }
    async updateLastOnlineCheck() {
        try {
            const checkFile = path.join(electron_1.app.getPath('userData'), 'last-online-check.json');
            const data = { timestamp: Date.now() };
            await fs.promises.writeFile(checkFile, JSON.stringify(data, null, 2));
        }
        catch {
            // Ignore errors
        }
    }
    async saveLicense(licenseInfo) {
        try {
            console.log('--- Saving License ---');
            console.log('Target path:', this.licenseFile);
            await fs.promises.writeFile(this.licenseFile, JSON.stringify(licenseInfo, null, 2));
            console.log('License saved successfully.');
            this.licenseInfo = licenseInfo;
        }
        catch (error) {
            console.error('Failed to save license:', error);
        }
    }
    loadLicense() {
        try {
            console.log('--- Loading License ---');
            console.log('Attempting to load from:', this.licenseFile);
            if (fs.existsSync(this.licenseFile)) {
                const data = fs.readFileSync(this.licenseFile, 'utf8');
                console.log('File found. Data length:', data.length);
                return JSON.parse(data);
            }
            console.log('File NOT found.');
        }
        catch (error) {
            console.error('Failed to load license:', error);
        }
        return null;
    }
    async checkLicense() {
        const savedLicense = this.loadLicense();
        if (!savedLicense) {
            return { valid: false, message: 'No license found' };
        }
        return this.validateOffline(savedLicense.licenseKey);
    }
    getLicenseInfo() {
        return this.licenseInfo;
    }
    getHardwareId() {
        return this.hardwareId;
    }
    // Set license server URL (can be called from main process)
    setLicenseServerUrl(url) {
        this.licenseServerUrl = url;
    }
    getLicenseServerUrl() {
        return this.licenseServerUrl;
    }
    // Force online validation (for super admin or manual checks)
    async forceOnlineValidation(licenseKey) {
        try {
            return await this.validateOnline(licenseKey);
        }
        catch (error) {
            return { valid: false, message: `Online validation failed: ${error.message}` };
        }
    }
    // Check if license is valid for critical operations
    async isLicenseValidForOperation() {
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
        }
        catch {
            // Fall through to offline validation
        }
        // Fallback to offline validation
        const offlineResult = this.validateOffline(savedLicense.licenseKey);
        return { valid: offlineResult.valid, message: offlineResult.message };
    }
    // Anti-tampering measures
    detectTampering() {
        try {
            // Check if app has been modified
            const appPath = electron_1.app.getAppPath();
            const packageJson = path.join(appPath, 'package.json');
            if (fs.existsSync(packageJson)) {
                const stats = fs.statSync(packageJson);
                // Add more sophisticated checks here
                return false;
            }
            return true;
        }
        catch {
            return true;
        }
    }
}
exports.licensingManager = new LicensingManager();
//# sourceMappingURL=licensing.js.map