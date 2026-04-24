# SmartWay Pos Licensing System

## 🔐 Overview

This POS system includes a comprehensive licensing system to prevent unauthorized sharing and ensure proper revenue protection. The system uses hardware fingerprinting, cryptographic signatures, and both online and offline validation.

## 🏗️ Architecture

### Components:

1. **LicensingManager** (`src/lib/licensing.ts`) - Core licensing logic
2. **LicenseCheck** (`src/components/LicenseCheck.tsx`) - React component for license validation
3. **LicenseActivationDialog** (`src/components/dialogs/license-activation-dialog.tsx`) - UI for license activation
4. **IPC Handlers** (`electron/main.ts`) - Backend license management
5. **License Generator** (`scripts/generate-license.js`) - Utility for creating licenses

## 🚀 Quick Start

### 1. Setup for Development

```bash
# The licensing system is already integrated into the app
# For development, you can bypass it by modifying the LicenseCheck component
```

### 2. Generate a Test License

```bash
cd scripts
node generate-license.js
```

### 3. Test License Activation

1. Start the app
2. Enter the generated license key
3. The app should activate successfully

## 🔧 Configuration

### 1. Change Secret Key

**IMPORTANT**: Change the secret key in `src/lib/licensing.ts`:

```typescript
private readonly SECRET_KEY = 'your-secret-key-here'; // Change this!
```

### 2. Update License Server URL

In `src/lib/licensing.ts`, update the license server URL:

```typescript
const response = await fetch('https://your-license-server.com/validate', {
  // ... rest of the code
});
```

### 3. Set Up License Server

See `LICENSE_SERVER_EXAMPLE.md` for a complete license server implementation.

## 🛡️ Security Features

### 1. Hardware Fingerprinting

The system generates a unique hardware fingerprint based on:
- Hostname
- Platform (macOS/Windows/Linux)
- Architecture
- CPU count
- Total memory
- Network interfaces
- Machine-specific IDs (Serial numbers, UUIDs)

### 2. Cryptographic Signatures

Each license is cryptographically signed using HMAC-SHA256 to prevent tampering.

### 3. Dual Validation

- **Online validation**: Checks with your license server
- **Offline validation**: Falls back to local validation when offline

### 4. Anti-Tampering

- Detects if the app has been modified
- Logs suspicious activities
- Hardware binding prevents sharing

## 📋 License Structure

```typescript
interface LicenseInfo {
  licenseKey: string;        // Unique license identifier
  hardwareId: string;        // Bound to specific machine
  issuedDate: string;        // When license was created
  expiryDate?: string;       // Optional expiration
  maxUsers?: number;         // Optional user limit
  features: string[];        // Enabled features
  signature: string;         // Cryptographic signature
}
```

## 🎯 Feature Control

You can control access to features based on the license:

```typescript
// Example feature checking
const licenseInfo = await window.electron.invoke('get-license-info');
const hasAnalytics = licenseInfo?.features.includes('analytics');

if (hasAnalytics) {
  // Show analytics features
} else {
  // Hide or disable analytics
}
```

## 🔄 License Validation Flow

1. **App Startup**: LicenseCheck component validates license
2. **No License**: Shows activation dialog
3. **Invalid License**: Shows error and activation dialog
4. **Valid License**: App proceeds normally
5. **Periodic Checks**: Optional background validation

## 📊 Monitoring & Logging

All license activities are logged:

- License activation attempts
- Validation failures
- Hardware ID mismatches
- Tampering detection

Logs are stored in the database and can be viewed in the admin panel.

## 🚨 Error Handling

The system handles various error scenarios:

- **Network failures**: Falls back to offline validation
- **Invalid licenses**: Clear error messages
- **Hardware changes**: Graceful degradation
- **Tampering detection**: Security alerts

## 🔧 Customization

### 1. Add New Features

```typescript
// In the license generator
const features = ['basic_pos', 'inventory', 'analytics', 'your_new_feature'];

// In your components
const hasNewFeature = licenseInfo?.features.includes('your_new_feature');
```

### 2. Custom Validation Rules

```typescript
// Add custom validation in LicensingManager
private validateCustomRules(licenseInfo: LicenseInfo): boolean {
  // Your custom validation logic
  return true;
}
```

### 3. Different License Types

```typescript
// Support different license tiers
enum LicenseTier {
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}
```

## 🚀 Production Deployment

### 1. Before Distribution

- [ ] Change the SECRET_KEY
- [ ] Set up production license server
- [ ] Update license server URLs
- [ ] Test on clean machines
- [ ] Obfuscate code (optional)

### 2. Distribution

- [ ] Build with electron-builder
- [ ] Sign your application
- [ ] Test license activation
- [ ] Monitor license usage

### 3. Support

- [ ] Set up support system
- [ ] Create license recovery process
- [ ] Document common issues
- [ ] Train support team

## 🔍 Troubleshooting

### Common Issues:

1. **"License not valid for this machine"**
   - Hardware has changed significantly
   - Solution: Generate new license for new hardware

2. **"License signature invalid"**
   - License file corrupted
   - Solution: Re-activate license

3. **"Network error during activation"**
   - Check internet connection
   - License server may be down
   - Solution: Try again later

4. **"License expired"**
   - License has reached expiration date
   - Solution: Renew license

## 📞 Support

For license-related issues:

1. Check the logs in the admin panel
2. Verify hardware ID matches
3. Contact support with:
   - Hardware ID
   - License key (first 8 characters)
   - Error message
   - System information

## 🔐 Security Best Practices

1. **Never share your SECRET_KEY**
2. **Use HTTPS for license server**
3. **Monitor license usage patterns**
4. **Regularly update security measures**
5. **Backup license data**
6. **Have a license recovery process**

## 📈 Analytics

The system provides insights into:

- License activation patterns
- Usage statistics
- Failed activation attempts
- Hardware distribution
- Feature usage

Use this data to improve your licensing strategy and detect potential issues. 