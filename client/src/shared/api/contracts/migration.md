# Migration Guide: Mock to Real API

## Overview
This document outlines the steps to migrate from mock API to production backend.

## Prerequisites
1. Backend API deployed and accessible
2. Environment variables configured:
   - `VITE_USE_MOCK_API=false`
   - `VITE_API_BASE_URL=https://api.yourdomain.com`

## Migration Steps

### 1. Update Environment
Set `VITE_USE_MOCK_API=false` in `.env` file.

### 2. Verify API Compatibility
- Ensure backend endpoints match the contracts in `endpoints.md`
- Check response formats match entity definitions
- Validate error handling (401, 404, 500)

### 3. Test Critical Flows
- User authentication (login/register)
- Route listing and details
- GPX upload processing
- Data persistence across sessions

### 4. Handle Differences
- Adjust for any backend-specific validation rules
- Update error messages if needed
- Modify request/response mapping if required

### 5. Performance Considerations
- Implement proper caching strategies
- Add loading states for slower network requests
- Consider pagination for large datasets

### 6. Security
- Ensure HTTPS is used in production
- Validate JWT token handling
- Check CORS configuration

## Rollback Plan
If issues arise:
1. Set `VITE_USE_MOCK_API=true` to revert to mocks
2. Debug backend issues separately
3. Gradually enable features as backend is fixed

## Testing
- Run full test suite against real API
- Test edge cases and error scenarios
- Validate data integrity
