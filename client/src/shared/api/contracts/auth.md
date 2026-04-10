# Auth Contract

## Request Bodies
### Login
```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

### Register
```json
{
  "firstName": "John",
  "lastName": "Rider",
  "email": "john@example.com",
  "password": "secret123"
}
```

## Response Shape
The frontend expects nested auth responses and normalizes the nested `user` object.

```json
{
  "token": "jwt-or-compatible-bearer-token",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Rider",
    "email": "john@example.com",
    "role": "user",
    "isActive": true,
    "createdAt": "2026-04-10T09:00:00Z"
  }
}
```

After normalization, the frontend uses:
```json
{
  "id": 1,
  "fullName": "John Rider",
  "email": "john@example.com",
  "role": "user",
  "isActive": true,
  "createdAt": "2026-04-10T09:00:00Z"
}
```

## Token Handling
- token is stored in local storage as `rydo_token`
- the auth user is stored separately as `rydo-user`
- the API client automatically adds the bearer token to requests
- `401` responses trigger the unauthorized handler configured by the auth context

## Role Rules
- allowed values: `user`, `admin`
- unknown roles are normalized to `user`

## Development Modes
### Real API mode
- `VITE_API_MODE=real`
- uses `VITE_API_BASE_URL`
- no dev login bypass should be used

### Mock API mode
- `VITE_API_MODE=mock`
- auth responses still use the same nested shape

### Dev auth bypass
Allowed only when:
- Vite dev server is running
- `VITE_API_MODE=mock`
- `VITE_DEV_AUTH_ENABLED=true`

Optional:
- `VITE_DEV_ROLE=user|admin`
