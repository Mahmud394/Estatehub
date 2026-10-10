# EstateHub API Documentation

Base URL (development): `http://localhost:5000/api`

All responses use this shape:

```json
{ "success": true, "message": "OK", "data": { } }
{ "success": false, "message": "What went wrong", "errors": null }
```

## Phase 1 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | none | Confirms the API is running and MySQL is reachable |

Example response:

```json
{ "success": true, "message": "EstateHub API is healthy", "data": { "api": "up", "database": "up" } }
```

More endpoints (auth, properties, comments, messages, admin, AI) are added in later phases.
