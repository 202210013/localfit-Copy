# Profile Management Module

## Overview
The Profile Management module allows users to conveniently edit and update their personal information including name, email, phone, address, bio, and password. This module also includes profile image upload functionality.

## Features

### 1. Profile Information Management
- **Full Name**: Update user's display name
- **Email Address**: Change email (with validation)
- **Phone Number**: Add/update phone number
- **Address**: Add/update physical address
- **Bio**: Personal description (up to 500 characters)
- **Profile Image**: Upload and manage profile picture

### 2. Password Management
- **Current Password Verification**: Requires current password for security
- **New Password**: Set new password with strength requirements
- **Password Confirmation**: Confirm new password matches
- **Real-time Validation**: Visual feedback on password requirements

### 3. Account Settings
- **Account Information**: View user ID, email, and account timestamps
- **Quick Actions**: Easy navigation to different profile sections
- **Logout**: Secure session termination

## Components

### Frontend (Angular)
- **ProfileComponent** (`src/app/profile/`)
  - `profile.component.ts`: Component logic with form validation
  - `profile.component.html`: Responsive template with tabbed navigation
  - `profile.component.css`: Modern styling with mobile support

### Backend (PHP)
- **UserService** (`ecomm_api/services/UserService.php`)
  - `getUserProfile()`: Fetch user profile data
  - `updateUserProfile()`: Update user information
  - `changeUserPassword()`: Change user password with verification
  - `uploadProfileImage()`: Handle profile image uploads

### Database Schema
Required columns in `users` table:
```sql
- phone VARCHAR(20) NULL
- address TEXT NULL  
- bio TEXT NULL
- profile_image VARCHAR(255) NULL
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

## API Endpoints

### GET /api/profile
Returns user profile information
- **Authentication**: Required
- **Response**: JSON with user profile data

### PUT /api/profile  
Updates user profile information
- **Authentication**: Required
- **Payload**: JSON with profile fields to update
- **Response**: Updated user profile data

### POST /api/profile-image
Uploads profile image
- **Authentication**: Required
- **Payload**: FormData with image file
- **Response**: Upload status and image path

### POST /api/change-password
Changes user password
- **Authentication**: Required
- **Payload**: JSON with currentPassword and newPassword
- **Response**: Success/error message

## Security Features

1. **Authentication Required**: All profile operations require valid session token
2. **Password Verification**: Current password must be provided for password changes
3. **File Upload Validation**: 
   - File type restrictions (JPG, PNG, GIF only)
   - File size limits (5MB maximum)
   - Secure file naming with unique IDs
4. **Input Validation**: Server-side validation for all profile fields
5. **SQL Injection Prevention**: Prepared statements for all database operations

## File Upload Management

- **Upload Directory**: `e-comm-images/profile/`
- **Supported Formats**: JPEG, PNG, GIF
- **Maximum Size**: 5MB
- **File Naming**: `{uniqid}_profile.{extension}`
- **Cleanup**: Failed uploads are automatically removed

## Usage

### Navigation
Access the profile page through:
1. Main navigation in product listing header
2. Direct URL: `/profile`
3. Authentication required - redirects to login if not authenticated

### Profile Management
1. **Update Profile**: Fill in the form fields and click "Save Changes"
2. **Change Password**: Navigate to Password tab, enter current and new passwords
3. **Upload Image**: Click on profile picture to select and upload new image
4. **View Settings**: Check account information and use quick actions

## Installation Setup

1. **Database**: Run `profile_setup.sql` to add required columns
2. **Directory**: Ensure `e-comm-images/profile/` exists with write permissions
3. **Routes**: Profile routes are automatically registered in `app.routes.ts`
4. **Navigation**: Profile link is added to main navigation header

## Mobile Responsiveness

The profile module is fully responsive with:
- Mobile-optimized navigation tabs
- Responsive form layouts
- Touch-friendly image upload
- Mobile-first CSS approach
- Accessible form controls

## Error Handling

- **Frontend**: Form validation with real-time feedback
- **Backend**: Comprehensive error responses with HTTP status codes
- **File Upload**: Validation and cleanup on errors
- **Authentication**: Automatic redirects for unauthorized access

## Dependencies

### Frontend
- Angular Reactive Forms
- Router for navigation
- HttpClient for API calls
- Font Awesome for icons

### Backend  
- PHP PDO for database operations
- Session management for authentication
- File upload handling

## Browser Support

- Modern browsers with ES6+ support
- Mobile browsers (iOS Safari, Chrome Mobile)
- Desktop browsers (Chrome, Firefox, Safari, Edge)
