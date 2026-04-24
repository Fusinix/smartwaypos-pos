# Offline Licensing System

## 🔌 **Offline-First Design**

The SmartWay Pos licensing system is designed to work **seamlessly offline** while maintaining security. Here's how it works:

## 🏗️ **Offline Architecture**

### **Dual Validation System**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   App Startup   │───▶│ Online Check    │───▶│ Server Response │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Offline Fallback│    │ Network Error   │    │ License Saved   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Local Validation│
└─────────────────┘
```

## 🔄 **Offline Workflow**

### **1. Initial Activation (Online Required)**
- User enters license key
- App connects to license server
- Server validates and returns license info
- License saved locally with cryptographic signature
- App works normally

### **2. Subsequent Starts (Offline Capable)**
- App checks for local license file
- Validates hardware ID match
- Verifies cryptographic signature
- Checks expiration date
- App starts if all validations pass

### **3. Periodic Online Validation**
- App attempts online validation when internet available
- Updates last online check timestamp
- Refreshes license if needed
- Continues working offline

## ⚙️ **Offline Configuration**

### **Grace Period Settings**
```typescript
// In src/lib/licensing.ts
private readonly OFFLINE_GRACE_PERIOD_DAYS = 30; // Days license can work offline
private readonly REQUIRE_ONLINE_ACTIVATION = true; // Must activate online first
private readonly OFFLINE_VALIDATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
```

### **Customizable Settings**
- **Grace Period**: How long license works offline (default: 30 days)
- **Online Activation**: Whether initial activation requires internet
- **Validation Interval**: How often to check online (default: 24 hours)

## 🛡️ **Offline Security**

### **Local Validation Checks**
1. **Hardware Binding** - License tied to specific machine
2. **Cryptographic Signature** - Prevents license tampering
3. **Expiration Check** - Respects license expiry dates
4. **Grace Period** - Limits offline usage duration

### **Anti-Tampering Measures**
- License files stored in secure app directory
- Cryptographic signatures prevent modification
- Hardware fingerprinting prevents sharing
- Grace period prevents indefinite offline use

## 📱 **User Experience**

### **Online Mode**
```
✅ Connected to internet
✅ License validated with server
✅ All features available
✅ Real-time updates
```

### **Offline Mode**
```
⚠️  Working offline
✅ License validated locally
✅ All features available
⚠️  Grace period: 25 days remaining
```

### **Grace Period Warning**
```
🚨 Offline for 28 days
⚠️  Connect to internet soon
⚠️  License validation required
```

## 🔧 **Implementation Details**

### **File Storage**
```
App Data Directory/
├── license.json              # License information
├── last-online-check.json    # Last online validation timestamp
└── logs/                     # License activity logs
```

### **License File Structure**
```json
{
  "licenseKey": "abc123def456",
  "hardwareId": "machine-fingerprint",
  "issuedDate": "2024-01-01T00:00:00Z",
  "expiryDate": "2024-12-31T23:59:59Z",
  "maxUsers": 5,
  "features": ["basic_pos", "inventory", "analytics"],
  "signature": "cryptographic-signature"
}
```

### **Offline Check File**
```json
{
  "timestamp": 1704067200000,
  "lastValidation": "2024-01-01T00:00:00Z"
}
```

## 🚀 **Usage Scenarios**

### **Scenario 1: Bar with Stable Internet**
- **Initial Setup**: Online activation required
- **Daily Use**: Online validation happens automatically
- **Offline Periods**: Works seamlessly during brief outages
- **Benefits**: Real-time updates, automatic license refresh

### **Scenario 2: Remote Bar with Limited Internet**
- **Initial Setup**: Online activation (can be done at office)
- **Daily Use**: Works offline, validates when internet available
- **Offline Periods**: Full functionality for 30 days
- **Benefits**: No interruption to business operations

### **Scenario 3: Temporary Internet Outage**
- **App Behavior**: Continues working normally
- **User Experience**: No interruption
- **Recovery**: Automatically validates when internet returns
- **Benefits**: Seamless operation during outages

## 🔍 **Monitoring & Logging**

### **Offline Activities Logged**
- License validation attempts
- Offline usage duration
- Grace period warnings
- Failed validation attempts
- Hardware ID mismatches

### **Log Examples**
```json
{
  "timestamp": "2024-01-01T10:00:00Z",
  "action": "license_validation",
  "mode": "offline",
  "result": "success",
  "offline_days": 5
}
```

## ⚠️ **Limitations & Considerations**

### **Offline Limitations**
- **Initial Activation**: Requires internet connection
- **Grace Period**: Limited offline duration (configurable)
- **Feature Updates**: New features require online validation
- **License Changes**: Modifications require online connection

### **Security Considerations**
- **Local Storage**: License files stored locally
- **Hardware Changes**: May require re-activation
- **Time Manipulation**: Grace period based on system time
- **File Tampering**: Detected by cryptographic signatures

## 🔧 **Customization Options**

### **Adjust Grace Period**
```typescript
// For longer offline periods
private readonly OFFLINE_GRACE_PERIOD_DAYS = 90; // 3 months

// For shorter offline periods
private readonly OFFLINE_GRACE_PERIOD_DAYS = 7; // 1 week
```

### **Disable Online Requirement**
```typescript
// Allow offline activation (less secure)
private readonly REQUIRE_ONLINE_ACTIVATION = false;
```

### **Custom Validation Rules**
```typescript
// Add custom offline validation
private validateOfflineCustom(license: LicenseInfo): boolean {
  // Your custom validation logic
  return true;
}
```

## 🚨 **Troubleshooting**

### **Common Offline Issues**

1. **"Grace period expired"**
   - **Cause**: Been offline too long
   - **Solution**: Connect to internet for validation

2. **"Hardware ID mismatch"**
   - **Cause**: Hardware changed significantly
   - **Solution**: Re-activate license

3. **"License signature invalid"**
   - **Cause**: License file corrupted
   - **Solution**: Re-activate license

4. **"No license found"**
   - **Cause**: License not activated
   - **Solution**: Activate license online

### **Support Commands**
```bash
# Check license status
# View logs
# Reset license
# Generate new license
```

## 📊 **Analytics & Reporting**

### **Offline Usage Metrics**
- Days spent offline
- Grace period utilization
- Validation success rates
- Hardware change frequency

### **Business Insights**
- Internet connectivity patterns
- License usage optimization
- Support ticket reduction
- Customer satisfaction

## 🎯 **Best Practices**

### **For Developers**
1. **Test offline scenarios** thoroughly
2. **Monitor grace period usage**
3. **Provide clear user feedback**
4. **Log all offline activities**
5. **Handle edge cases gracefully**

### **For Users**
1. **Activate license when internet available**
2. **Connect periodically for validation**
3. **Report hardware changes promptly**
4. **Keep app updated**
5. **Contact support for issues**

## 🔮 **Future Enhancements**

### **Planned Features**
- **Incremental validation** - Partial online checks
- **Offline analytics** - Local usage tracking
- **Smart sync** - Background validation
- **Multi-device** - Shared license management
- **Offline updates** - Local feature updates

### **Advanced Security**
- **Time-based validation** - More sophisticated time checks
- **Network fingerprinting** - Additional security layers
- **Behavioral analysis** - Usage pattern detection
- **Encrypted storage** - Enhanced local security 