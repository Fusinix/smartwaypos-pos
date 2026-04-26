#!/usr/bin/env node

const crypto = require('crypto');
const readline = require('readline');

const SECRET_KEY = 'your-secret-key-here'; // Change this to match your licensing manager

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function generateLicenseKey() {
  return crypto.randomBytes(16).toString('hex');
}

function signLicense(licenseData) {
  return crypto.createHmac('sha256', SECRET_KEY)
    .update(JSON.stringify(licenseData))
    .digest('hex');
}

function generateLicense() {
  const licenseKey = generateLicenseKey();
  const issuedDate = new Date().toISOString();
  
  // Get user input
  rl.question('Hardware ID (leave empty for testing): ', (hardwareId) => {
    rl.question('Expiry date (YYYY-MM-DD, leave empty for no expiry): ', (expiryDate) => {
      rl.question('Max users (leave empty for unlimited): ', (maxUsers) => {
        rl.question('Features (comma-separated, e.g., basic_pos,inventory,analytics): ', (features) => {
          
          const licenseData = {
            licenseKey,
            hardwareId: hardwareId || 'test-hardware-id',
            issuedDate,
            expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
            maxUsers: maxUsers ? parseInt(maxUsers) : undefined,
            features: features ? features.split(',').map(f => f.trim()) : ['basic_pos']
          };
          
          const signature = signLicense(licenseData);
          const license = { ...licenseData, signature };
          
          console.log(JSON.stringify(license, null, 2));
          console.log(licenseKey);
          
          rl.close();
        });
      });
    });
  });
}

generateLicense(); 