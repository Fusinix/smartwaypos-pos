# Product Requirements Document (PRD)
## License Management Admin Dashboard

**Version:** 1.0  
**Date:** January 2025  
**Product:** SmartWay Pos License Management System  
**Platform:** Next.js Web Application

---

## 1. Executive Summary

### 1.1 Purpose
This document outlines the requirements for a web-based admin dashboard that enables remote management of licenses for the SmartWay Pos Electron application. The dashboard will allow administrators to create, manage, extend, and monitor licenses for all deployed POS systems.

### 1.2 Objectives
- Enable remote license management without physical access to devices
- Provide real-time visibility into license status and device health
- Streamline subscription renewal and extension processes
- Support multiple admin users with role-based access
- Ensure secure authentication and data protection

### 1.3 Success Criteria
- 100% of license operations can be performed remotely
- Admin can extend subscriptions within 30 seconds
- Real-time license status visibility
- Zero security breaches
- Support for 1000+ active licenses

---

## 2. User Personas

### 2.1 Super Admin
- **Role:** Primary system administrator
- **Needs:** Full control over all licenses, users, and system settings
- **Goals:** Manage all customer licenses, extend subscriptions, monitor system health
- **Pain Points:** Need to physically visit customers to extend licenses

### 2.2 Admin
- **Role:** Secondary administrator
- **Needs:** Manage licenses but with some restrictions
- **Goals:** View and extend licenses, but cannot delete or modify system settings
- **Pain Points:** Limited access when super admin is unavailable

### 2.3 Support Staff (Future)
- **Role:** Customer support representative
- **Needs:** View-only access to license information
- **Goals:** Help customers troubleshoot license issues
- **Pain Points:** Cannot make changes, only view information

---

## 3. Core Features

### 3.1 Authentication & Authorization

#### 3.1.1 Login System
- **Description:** Secure login with username and password
- **Requirements:**
  - Username/password authentication
  - Password hashing using bcrypt
  - Session management with JWT tokens
  - "Remember me" functionality (optional)
  - Password reset functionality
  - Two-factor authentication (future enhancement)
- **Acceptance Criteria:**
  - Users can log in with valid credentials
  - Invalid credentials show appropriate error messages
  - Sessions expire after 24 hours of inactivity
  - Passwords must be at least 8 characters with complexity requirements

#### 3.1.2 Role-Based Access Control
- **Description:** Different permission levels for different admin types
- **Requirements:**
  - Super Admin: Full access to all features
  - Admin: Can manage licenses but cannot delete system data
  - Support: Read-only access (future)
- **Acceptance Criteria:**
  - UI elements are hidden/disabled based on user role
  - API endpoints enforce role-based permissions
  - Unauthorized actions return appropriate error messages

---

### 3.2 License Management

#### 3.2.1 License Dashboard
- **Description:** Overview page showing key metrics and recent activity
- **Requirements:**
  - Total active licenses count
  - Expired licenses count
  - Licenses expiring in next 7/30 days
  - Recent license activations
  - Recent subscription extensions
  - System health indicators
  - Quick stats cards (total revenue, active devices, etc.)
- **UI Components:**
  - Statistics cards
  - Charts/graphs for trends
  - Recent activity feed
  - Quick action buttons
- **Acceptance Criteria:**
  - All metrics update in real-time
  - Data loads within 2 seconds
  - Charts are interactive and responsive

#### 3.2.2 License List View
- **Description:** Table showing all licenses with filtering and search
- **Requirements:**
  - Display columns:
    - License Key
    - Hardware ID
    - Customer Name (optional field)
    - Subscription End Date
    - Status (Active/Expired/Suspended)
    - Last Check-In
    - Days Remaining
    - Actions (View/Edit/Extend)
  - Filtering options:
    - By status (All/Active/Expired/Suspended)
    - By expiration date range
    - By last check-in date
  - Search functionality:
    - Search by license key
    - Search by hardware ID
    - Search by customer name
  - Sorting:
    - By subscription end date
    - By last check-in
    - By status
  - Pagination:
    - 25/50/100 items per page
    - Page navigation
  - Bulk actions:
    - Select multiple licenses
    - Bulk extend subscriptions
    - Bulk export
- **Acceptance Criteria:**
  - Table loads with all licenses
  - Filters work correctly
  - Search is instant (debounced)
  - Sorting works on all columns
  - Pagination handles large datasets efficiently

#### 3.2.3 Create New License
- **Description:** Form to generate new license keys
- **Requirements:**
  - Input fields:
    - Customer Name (optional)
    - Subscription Duration (days/months/years)
    - Start Date (default: today)
    - End Date (auto-calculated)
    - Notes (optional)
  - License key generation:
    - Auto-generate unique license key
    - Format: `DRINX-XXXX-XXXX-XXXX` (alphanumeric)
    - Ensure uniqueness
  - Hardware ID binding:
    - Option to bind to specific hardware ID immediately
    - Or allow activation later
  - Validation:
    - Ensure end date is after start date
    - Minimum subscription period: 1 day
    - Maximum subscription period: 10 years
- **Acceptance Criteria:**
  - License key is generated and unique
  - License is saved to database
  - Success message displayed
  - License appears in list immediately

#### 3.2.4 View License Details
- **Description:** Detailed view of a single license
- **Requirements:**
  - Display all license information:
    - License Key
    - Hardware ID
    - Customer Information
    - Subscription Dates (Start/End)
    - Status
    - Last Check-In timestamp
    - Days Remaining
    - App Version (last reported)
    - Activation Date
    - Created Date
    - Notes
  - Device Information:
    - Hardware fingerprint details
    - Last online check timestamp
    - Is device currently online
  - Activity History:
    - Timeline of all license events
    - Validations
    - Extensions
    - Status changes
  - Quick Actions:
    - Extend Subscription button
    - Suspend License button
    - Reactivate License button
    - Delete License button (with confirmation)
- **Acceptance Criteria:**
  - All information displays correctly
  - Activity history is chronological
  - Actions work as expected
  - Confirmation dialogs prevent accidental actions

#### 3.2.5 Extend Subscription
- **Description:** Add time to an existing license subscription
- **Requirements:**
  - Input methods:
    - Add days (e.g., +30 days)
    - Add months (e.g., +1 month)
    - Set specific end date
  - Calculation:
    - Extend from current end date
    - Or extend from today (configurable)
  - Validation:
    - Cannot set end date in the past
    - Maximum extension: 10 years from today
  - Confirmation:
    - Show old end date
    - Show new end date
    - Show days added
    - Require confirmation
  - Notification:
    - Success message
    - Update license list immediately
    - Log the action
- **Acceptance Criteria:**
  - Subscription extends correctly
  - New end date is accurate
  - License status updates if expired
  - Action is logged

#### 3.2.6 Suspend/Reactivate License
- **Description:** Temporarily disable or re-enable a license
- **Requirements:**
  - Suspend:
    - Change status to "suspended"
    - License will be invalid on next validation
    - Reason field (optional)
    - Confirmation required
  - Reactivate:
    - Change status back to "active"
    - License becomes valid immediately
    - Confirmation required
- **Acceptance Criteria:**
  - Status changes correctly
  - License validation reflects new status
  - Actions are logged

#### 3.2.7 Delete License
- **Description:** Permanently remove a license (with safeguards)
- **Requirements:**
  - Only Super Admin can delete
  - Confirmation dialog with warning
  - Type license key to confirm deletion
  - Soft delete option (mark as deleted, don't remove from DB)
  - Cannot delete if license is currently active on device
- **Acceptance Criteria:**
  - Deletion requires multiple confirmations
  - License is removed from active list
  - Historical data is preserved (if soft delete)

---

### 3.3 Device Management

#### 3.3.1 Device List View
- **Description:** View all devices with their license status
- **Requirements:**
  - Display columns:
    - Hardware ID
    - License Key
    - Customer Name
    - Last Check-In
    - Is Online (real-time indicator)
    - App Version
    - Days Since Last Check-In
    - Status
  - Filtering:
    - By online/offline status
    - By last check-in date
    - By app version
  - Actions:
    - View device details
    - Force license validation
    - Send notification (future)
- **Acceptance Criteria:**
  - Online status updates in real-time
  - Device list is sortable and filterable
  - Actions work correctly

#### 3.3.2 Device Details
- **Description:** Detailed information about a specific device
- **Requirements:**
  - Device Information:
    - Hardware ID
    - License Key
    - Platform (Windows/Mac/Linux)
    - App Version
    - Last Check-In timestamp
    - Online Status
  - License Information:
    - Current license status
    - Subscription end date
    - Days remaining
  - Activity Log:
    - All validation attempts
    - Check-in history
    - Error logs (if any)
  - Actions:
    - Force validation
    - Extend subscription
    - View license details
- **Acceptance Criteria:**
  - All device information displays
  - Activity log is accurate
  - Actions are functional

---

### 3.4 Analytics & Reporting

#### 3.4.1 License Analytics Dashboard
- **Description:** Visual analytics for license usage and trends
- **Requirements:**
  - Charts:
    - Active licenses over time (line chart)
    - License status distribution (pie chart)
    - Expirations by month (bar chart)
    - Revenue trends (if tracking payments)
    - Device check-in frequency
  - Metrics:
    - Total licenses
    - Active licenses
    - Expired licenses
    - Licenses expiring this month
    - Average subscription duration
    - Renewal rate
  - Date Range Selector:
    - Last 7 days
    - Last 30 days
    - Last 90 days
    - Last year
    - Custom range
- **Acceptance Criteria:**
  - Charts render correctly
  - Data is accurate
  - Date ranges work properly
  - Charts are responsive

#### 3.4.2 Reports
- **Description:** Generate downloadable reports
- **Requirements:**
  - Report Types:
    - License Status Report (all licenses)
    - Expiring Licenses Report (next 30/60/90 days)
    - Expired Licenses Report
    - Device Activity Report
    - Revenue Report (if applicable)
  - Export Formats:
    - CSV
    - Excel (XLSX)
    - PDF
  - Report Options:
    - Date range selection
    - Filter by status
    - Include/exclude columns
- **Acceptance Criteria:**
  - Reports generate correctly
  - All formats work
  - Data is accurate
  - Large reports don't timeout

---

### 3.5 User Management

#### 3.5.1 Admin Users List
- **Description:** Manage admin users who can access the dashboard
- **Requirements:**
  - Display columns:
    - Username
    - Role
    - Email (optional)
    - Last Login
    - Created Date
    - Status (Active/Inactive)
    - Actions
  - Actions:
    - Create new admin
    - Edit admin
    - Deactivate admin
    - Delete admin (Super Admin only)
- **Acceptance Criteria:**
  - User list displays correctly
  - All actions work
  - Permissions are enforced

#### 3.5.2 Create/Edit Admin User
- **Description:** Form to create or edit admin users
- **Requirements:**
  - Input fields:
    - Username (required, unique)
    - Email (optional)
    - Password (required for new, optional for edit)
    - Role (Super Admin/Admin)
    - Status (Active/Inactive)
  - Validation:
    - Username must be unique
    - Password must meet complexity requirements
    - Email must be valid format (if provided)
  - Password Requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
- **Acceptance Criteria:**
  - Form validates correctly
  - User is created/updated successfully
  - Password is hashed securely

---

### 3.6 Settings

#### 3.6.1 System Settings
- **Description:** Configure system-wide settings
- **Requirements:**
  - License Settings:
    - Default subscription duration
    - Grace period days (offline)
    - Maximum subscription period
    - License key format
  - Notification Settings:
    - Email notifications for expiring licenses
    - Days before expiration to notify
    - Notification recipients
  - Security Settings:
    - Session timeout duration
    - Password policy
    - Two-factor authentication (future)
  - General Settings:
    - Company name
    - Support email
    - Support phone
- **Acceptance Criteria:**
  - Settings save correctly
  - Changes take effect immediately
  - Validation works properly

---

## 4. User Flows

### 4.1 Login Flow
1. User navigates to admin dashboard URL
2. Login page displays
3. User enters username and password
4. System validates credentials
5. If valid: Redirect to dashboard, create session
6. If invalid: Show error message, allow retry

### 4.2 Extend Subscription Flow
1. Admin navigates to License List
2. Admin clicks "Extend" on a license
3. Extend Subscription modal opens
4. Admin enters extension period (days/months)
5. System shows preview (old date → new date)
6. Admin confirms
7. System updates license in database
8. Success message displayed
9. License list refreshes with updated end date

### 4.3 Create License Flow
1. Admin navigates to License List
2. Admin clicks "Create New License"
3. Create License form opens
4. Admin fills in:
   - Customer name (optional)
   - Subscription duration
   - Notes (optional)
5. System generates unique license key
6. Admin reviews license details
7. Admin clicks "Create License"
8. License is saved to database
9. Success message with license key displayed
10. Admin can copy license key
11. License appears in list

### 4.4 View License Details Flow
1. Admin navigates to License List
2. Admin clicks on a license key or "View" button
3. License Details page opens
4. All license information displays
5. Activity history shows
6. Admin can perform actions:
   - Extend subscription
   - Suspend/Reactivate
   - View device information
   - Delete (if Super Admin)

---

## 5. Technical Requirements

### 5.1 Technology Stack
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL or MySQL
- **ORM:** Prisma or Drizzle
- **Authentication:** NextAuth.js or custom JWT
- **UI Framework:** Tailwind CSS + shadcn/ui (or similar)
- **State Management:** React Context or Zustand
- **API:** Next.js API Routes
- **Deployment:** Vercel, AWS, or self-hosted

### 5.2 Database Schema
See `LICENSE_API_DOCUMENTATION.md` for detailed schema.

### 5.3 API Endpoints
See `LICENSE_API_DOCUMENTATION.md` for complete API specification.

### 5.4 Performance Requirements
- Page load time: < 2 seconds
- API response time: < 500ms
- Support 1000+ concurrent licenses
- Real-time updates for license status
- Efficient pagination for large datasets

### 5.5 Security Requirements
- HTTPS only in production
- Password hashing with bcrypt (minimum 10 rounds)
- JWT tokens for sessions
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Role-based access control
- Audit logging for all admin actions

### 5.6 Browser Support
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### 5.7 Responsive Design
- Desktop: Full feature set
- Tablet: Optimized layout
- Mobile: Read-only view (future)

---

## 6. UI/UX Requirements

### 6.1 Design Principles
- Clean and professional
- Easy to navigate
- Consistent with SmartWay Pos branding
- Accessible (WCAG 2.1 AA)
- Fast and responsive

### 6.2 Color Scheme
- Primary: Match SmartWay Pos brand colors
- Success: Green (#10b981)
- Warning: Yellow (#f59e0b)
- Error: Red (#ef4444)
- Info: Blue (#3b82f6)

### 6.3 Layout Structure
- **Header:**
  - Logo
  - Navigation menu
  - User profile dropdown
  - Notifications (future)
- **Sidebar:**
  - Dashboard
  - Licenses
  - Devices
  - Analytics
  - Users (Super Admin only)
  - Settings
  - Logout
- **Main Content:**
  - Dynamic based on route
  - Breadcrumbs
  - Page title
  - Action buttons
  - Data tables/cards

### 6.4 Components
- Data tables with sorting/filtering
- Modals for forms and confirmations
- Toast notifications for feedback
- Loading states
- Empty states
- Error states
- Charts and graphs
- Forms with validation
- Search bars
- Date pickers
- Dropdowns and selects

---

## 7. Non-Functional Requirements

### 7.1 Reliability
- 99.9% uptime
- Graceful error handling
- Data backup and recovery
- Transaction rollback on errors

### 7.2 Scalability
- Support 10,000+ licenses
- Handle 100+ concurrent admin users
- Efficient database queries
- Caching where appropriate

### 7.3 Maintainability
- Clean, documented code
- TypeScript for type safety
- Modular architecture
- Comprehensive error logging

### 7.4 Usability
- Intuitive navigation
- Clear error messages
- Helpful tooltips
- Keyboard shortcuts (future)
- Search functionality throughout

---

## 8. Future Enhancements (Out of Scope for MVP)

### 8.1 Phase 2 Features
- Email notifications for expiring licenses
- Automated subscription renewals
- Customer portal (self-service)
- Payment integration
- Multi-device license support
- License transfer between devices
- API for third-party integrations
- Mobile app for admins
- Advanced analytics and forecasting
- Bulk operations (import/export)
- License templates
- Custom license key formats

### 8.2 Phase 3 Features
- Two-factor authentication
- SSO integration
- Advanced reporting and BI
- White-label options
- Multi-tenant support
- License usage analytics
- Device health monitoring
- Automated alerts and notifications

---

## 9. Success Metrics

### 9.1 Key Performance Indicators (KPIs)
- **Time to Extend License:** < 30 seconds
- **License Management Efficiency:** 100 licenses managed per hour
- **System Uptime:** > 99.9%
- **User Satisfaction:** > 4.5/5 rating
- **Error Rate:** < 0.1%
- **Page Load Time:** < 2 seconds
- **API Response Time:** < 500ms

### 9.2 Business Metrics
- Number of licenses managed
- Subscription extension frequency
- Customer retention rate
- Support ticket reduction
- Revenue tracking (if applicable)

---

## 10. Implementation Phases

### Phase 1: MVP (Weeks 1-3)
**Priority: Critical**
- Authentication system
- License list view
- Create license
- View license details
- Extend subscription
- Basic dashboard

### Phase 2: Enhanced Features (Weeks 4-5)
**Priority: High**
- Advanced filtering and search
- Device management
- User management
- Analytics dashboard
- Reports and exports

### Phase 3: Polish & Optimization (Week 6)
**Priority: Medium**
- UI/UX improvements
- Performance optimization
- Comprehensive testing
- Documentation
- Security audit

---

## 11. Dependencies

### 11.1 External Dependencies
- Database hosting (PostgreSQL/MySQL)
- Email service (for notifications - future)
- Domain and SSL certificate
- Hosting platform (Vercel/AWS/etc.)

### 11.2 Internal Dependencies
- License server API endpoints (from Electron app)
- Database schema design
- Admin user creation process
- License key generation algorithm

---

## 12. Risks & Mitigation

### 12.1 Security Risks
- **Risk:** Unauthorized access to dashboard
- **Mitigation:** Strong authentication, rate limiting, audit logging

### 12.2 Data Risks
- **Risk:** Data loss or corruption
- **Mitigation:** Regular backups, transaction rollbacks, data validation

### 12.3 Performance Risks
- **Risk:** Slow performance with many licenses
- **Mitigation:** Database indexing, pagination, caching, query optimization

### 12.4 User Experience Risks
- **Risk:** Complex interface confuses users
- **Mitigation:** User testing, clear documentation, intuitive design

---

## 13. Acceptance Criteria Summary

### 13.1 Must Have (MVP)
✅ Secure login system  
✅ License list with basic filtering  
✅ Create new license  
✅ View license details  
✅ Extend subscription  
✅ Basic dashboard with key metrics  
✅ Role-based access control  

### 13.2 Should Have (Phase 2)
- Advanced filtering and search
- Device management
- User management
- Analytics and charts
- Reports and exports

### 13.3 Nice to Have (Future)
- Email notifications
- Mobile responsive design
- Advanced analytics
- API for integrations

---

## 14. Glossary

- **License Key:** Unique identifier for a license
- **Hardware ID:** Unique device fingerprint
- **Subscription End Date:** Date when license expires
- **Grace Period:** Days license can work offline
- **Check-In:** Device's validation request to server
- **Super Admin:** Highest privilege level
- **Admin:** Standard administrator with limited permissions
- **Suspended:** License temporarily disabled
- **Active:** License is valid and working
- **Expired:** License subscription has ended

---

## 15. Appendix

### 15.1 Related Documents
- `LICENSE_API_DOCUMENTATION.md` - API endpoint specifications
- Database schema documentation
- Security policy document

### 15.2 Contact Information
- Product Owner: [Your Name]
- Technical Lead: [Technical Lead Name]
- Support: [Support Email]

---

**Document Status:** Draft  
**Last Updated:** January 2025  
**Next Review:** After MVP completion

