# License Server API Documentation

This document describes the API endpoints that your Next.js backend needs to implement for the license system to work.

## Base URL

Set the `LICENSE_SERVER_URL` environment variable in your Electron app to point to your Next.js API base URL.

Example: `https://yourdomain.com` or `http://localhost:3000` for development

## Endpoints

### 1. License Validation

**POST** `/api/license/validate`

Validates a license key and returns license information.

**Request Body:**
```json
{
  "licenseKey": "string",
  "hardwareId": "string",
  "appVersion": "string",
  "timestamp": number
}
```

**Response (Success):**
```json
{
  "valid": true,
  "message": "License valid",
  "licenseInfo": {
    "licenseKey": "string",
    "hardwareId": "string",
    "issuedDate": "string (ISO date)",
    "subscriptionEndDate": "string (ISO date)",
    "status": "active" | "expired" | "suspended",
    "features": ["string"],
    "lastValidated": "string (ISO date)"
  }
}
```

**Response (Error):**
```json
{
  "valid": false,
  "message": "License expired" | "Invalid license" | "License suspended"
}
```

**Implementation Notes:**
- Check if license key exists in database
- Verify hardware ID matches (or allow multiple devices per license)
- Check subscription end date
- Check license status
- Update last validated timestamp
- Return updated license info

---

### 2. Super Admin Login

**POST** `/api/admin/login`

Authenticates super admin and validates license key.

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "licenseKey": "string",
  "hardwareId": "string"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "licenseInfo": {
    "licenseKey": "string",
    "hardwareId": "string",
    "issuedDate": "string",
    "subscriptionEndDate": "string",
    "status": "active",
    "lastValidated": "string"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid credentials" | "License not found" | "License expired"
}
```

**Implementation Notes:**
- Verify admin username and password (use bcrypt)
- Verify license key exists and matches hardware ID
- Return current license information
- Log admin access for security

---

### 3. Extend Subscription (Admin Dashboard)

**POST** `/api/admin/extend-subscription`

Extends a license subscription period. Called from your Next.js admin dashboard.

**Request Body:**
```json
{
  "licenseKey": "string",
  "daysToAdd": number,
  "adminId": "string"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Subscription extended successfully",
  "newEndDate": "string (ISO date)"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "License not found" | "Invalid request"
}
```

**Implementation Notes:**
- Verify admin permissions
- Find license by key
- Add days to current subscription end date
- Update database
- Log the action

---

### 4. Get License Details (Admin Dashboard)

**GET** `/api/admin/license/:licenseKey`

Gets detailed license information for admin dashboard.

**Response:**
```json
{
  "licenseKey": "string",
  "hardwareId": "string",
  "issuedDate": "string",
  "subscriptionEndDate": "string",
  "status": "active" | "expired" | "suspended",
  "deviceInfo": {
    "lastCheckIn": "string (ISO date)",
    "appVersion": "string",
    "isOnline": boolean
  },
  "createdAt": "string",
  "updatedAt": "string"
}
```

---

### 5. List All Licenses (Admin Dashboard)

**GET** `/api/admin/licenses`

Gets list of all licenses with pagination.

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 50)
- `status`: "active" | "expired" | "suspended" | "all" (default: "all")

**Response:**
```json
{
  "licenses": [
    {
      "licenseKey": "string",
      "hardwareId": "string",
      "subscriptionEndDate": "string",
      "status": "active",
      "lastCheckIn": "string",
      "createdAt": "string"
    }
  ],
  "total": number,
  "page": number,
  "limit": number
}
```

---

## Database Schema

### Licenses Table
```sql
CREATE TABLE licenses (
  id SERIAL PRIMARY KEY,
  license_key VARCHAR(255) UNIQUE NOT NULL,
  hardware_id VARCHAR(255) NOT NULL,
  issued_date TIMESTAMP NOT NULL,
  subscription_end_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'suspended'
  features JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Admin Users Table
```sql
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin', -- 'super_admin', 'admin'
  created_at TIMESTAMP DEFAULT NOW()
);
```

### License Logs Table
```sql
CREATE TABLE license_logs (
  id SERIAL PRIMARY KEY,
  license_key VARCHAR(255) NOT NULL,
  hardware_id VARCHAR(255),
  action VARCHAR(50) NOT NULL, -- 'validated', 'extended', 'suspended', 'activated'
  admin_id INTEGER REFERENCES admin_users(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Security Considerations

1. **HTTPS Only**: All API endpoints should use HTTPS in production
2. **Rate Limiting**: Implement rate limiting on all endpoints
3. **Input Validation**: Validate all input data
4. **SQL Injection Prevention**: Use parameterized queries
5. **Password Hashing**: Use bcrypt for admin passwords
6. **JWT Tokens**: Consider using JWT for admin sessions
7. **CORS**: Configure CORS to only allow your Electron app domain
8. **Logging**: Log all license validation attempts and admin actions

---

## Environment Variables

Set these in your Next.js `.env.local`:

```env
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret_key
ADMIN_SESSION_SECRET=your_session_secret
```

---

## Example Next.js API Route

Here's an example implementation for `/api/license/validate`:

```typescript
// app/api/license/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Your database connection

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { licenseKey, hardwareId } = body;

    // Find license in database
    const license = await db.license.findUnique({
      where: { license_key: licenseKey }
    });

    if (!license) {
      return NextResponse.json(
        { valid: false, message: 'Invalid license key' },
        { status: 404 }
      );
    }

    // Check hardware ID (allow multiple devices per license if needed)
    if (license.hardware_id !== hardwareId) {
      // Optionally allow multiple devices
      // For now, enforce single device
      return NextResponse.json(
        { valid: false, message: 'License not valid for this device' },
        { status: 403 }
      );
    }

    // Check subscription end date
    const now = new Date();
    const endDate = new Date(license.subscription_end_date);
    
    if (endDate < now) {
      // Update status to expired
      await db.license.update({
        where: { license_key: licenseKey },
        data: { status: 'expired' }
      });

      return NextResponse.json(
        { valid: false, message: 'License subscription expired' },
        { status: 403 }
      );
    }

    // Check status
    if (license.status !== 'active') {
      return NextResponse.json(
        { valid: false, message: `License is ${license.status}` },
        { status: 403 }
      );
    }

    // Update last validated
    await db.license.update({
      where: { license_key: licenseKey },
      data: { 
        updated_at: new Date(),
        // You might want to track last_check_in separately
      }
    });

    // Log validation
    await db.licenseLog.create({
      data: {
        license_key: licenseKey,
        hardware_id: hardwareId,
        action: 'validated',
        metadata: { appVersion: body.appVersion }
      }
    });

    // Return license info
    return NextResponse.json({
      valid: true,
      message: 'License valid',
      licenseInfo: {
        licenseKey: license.license_key,
        hardwareId: license.hardware_id,
        issuedDate: license.issued_date.toISOString(),
        subscriptionEndDate: license.subscription_end_date.toISOString(),
        status: license.status,
        features: license.features || [],
        lastValidated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('License validation error:', error);
    return NextResponse.json(
      { valid: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
```

---

## Testing

You can test the endpoints using curl or Postman:

```bash
# Test license validation
curl -X POST http://localhost:3000/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "test-license-key",
    "hardwareId": "test-hardware-id",
    "appVersion": "1.0.0",
    "timestamp": 1234567890
  }'
```

---

## Next Steps

1. Set up your Next.js project with these API routes
2. Configure your database with the schema above
3. Create admin users in the database
4. Generate test license keys
5. Set `LICENSE_SERVER_URL` environment variable in Electron app
6. Test the integration

