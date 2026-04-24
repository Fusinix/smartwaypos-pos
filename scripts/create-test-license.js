#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// This should match the SECRET_KEY in electron/licensing.ts
const SECRET_KEY = 'your-secret-key-here';

function generateLicenseKey() {
  return crypto.randomBytes(16).toString('hex');
}

function signLicense(licenseData) {
  return crypto.createHmac('sha256', SECRET_KEY)
    .update(JSON.stringify(licenseData))
    .digest('hex');
}

function createTestLicense() {
  const licenseKey = generateLicenseKey();
  const issuedDate = new Date().toISOString();
  
  // Create a test license that will work offline
  const licenseData = {
    licenseKey,
    hardwareId: 'test-hardware-id', // This will work for testing
    issuedDate,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
    maxUsers: 5,
    features: ['basic_pos', 'inventory', 'analytics', 'export_reports']
  };
  
  const signature = signLicense(licenseData);
  const license = { ...licenseData, signature };
  
  // Save to app data directory for testing
  const appDataPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Library', 'Application Support', 'SmartWay Pos');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
  }
  
  const licenseFilePath = path.join(appDataPath, 'license.json');
  fs.writeFileSync(licenseFilePath, JSON.stringify(license, null, 2));
  
  console.log('=== TEST LICENSE CREATED ===');
  console.log(JSON.stringify(license, null, 2));
  console.log('\n=== LICENSE KEY ===');
  console.log(licenseKey);
  console.log('\n=== LICENSE FILE SAVED ===');
  console.log(`Location: ${licenseFilePath}`);
  console.log('\n=== FOR TESTING ===');
  console.log('Hardware ID: test-hardware-id');
  console.log('Features:', license.features.join(', '));
  console.log('Expires:', new Date(license.expiryDate).toLocaleDateString());
  console.log('\n=== USAGE ===');
  console.log('1. Start the app');
  console.log('2. Enter the license key when prompted');
  console.log('3. The app should activate successfully');
}

console.log('SmartWay Pos Test License Creator');
console.log('============================\n');

createTestLicense(); 