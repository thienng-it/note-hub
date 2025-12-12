# Audit Logging API - Admin Endpoints

## Overview

Enhanced audit logging system with comprehensive admin endpoints for viewing, filtering, exporting, and analyzing audit logs.

## Authentication

All audit log endpoints require:
- Valid JWT token
- Admin role (`is_admin = true`)

## Endpoints

### 1. Get Audit Logs (with Filtering)

**GET** `/api/admin/audit-logs`

Retrieve audit logs with optional filtering and pagination.

**Query Parameters:**
- `user_id` (optional) - Filter by user ID
- `entity_type` (optional) - Filter by entity type (note, task, user, export)
- `entity_id` (optional) - Filter by entity ID
- `action` (optional) - Filter by action (view, create, update, delete)
- `start_date` (optional) - Filter by start date (ISO 8601 format)
- `end_date` (optional) - Filter by end date (ISO 8601 format)
- `page` (optional) - Page number (default: 1)
- `per_page` (optional) - Results per page (default: 50, max: 100)

**Response:**
```json
{
  "logs": [
    {
      "id": 1234,
      "user_id": 42,
      "username": "john_doe",
      "entity_type": "note",
      "entity_id": 567,
      "action": "update",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "metadata": {
        "title": true,
        "body": true
      },
      "created_at": "2024-12-12 10:30:00"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total_count": 1500,
    "total_pages": 30
  }
}
```

**Example:**
```bash
# Get all audit logs
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/admin/audit-logs

# Filter by user
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/admin/audit-logs?user_id=42&page=1&per_page=20"

# Filter by entity type and action
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/admin/audit-logs?entity_type=note&action=delete"

# Filter by date range
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/admin/audit-logs?start_date=2024-12-01&end_date=2024-12-12"
```

---

### 2. Get User Audit Logs

**GET** `/api/admin/audit-logs/user/:userId`

Retrieve all audit logs for a specific user.

**Path Parameters:**
- `userId` - User ID

**Query Parameters:**
- `limit` (optional) - Maximum number of logs (default: 100)
- `offset` (optional) - Offset for pagination (default: 0)

**Response:**
```json
{
  "logs": [
    {
      "id": 1234,
      "user_id": 42,
      "entity_type": "note",
      "entity_id": 567,
      "action": "view",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "metadata": null,
      "created_at": "2024-12-12 10:30:00"
    }
  ],
  "user_id": 42,
  "count": 150
}
```

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/admin/audit-logs/user/42
```

---

### 3. Get Entity Audit Logs

**GET** `/api/admin/audit-logs/entity/:entityType/:entityId`

Retrieve all audit logs for a specific entity (note, task, etc.).

**Path Parameters:**
- `entityType` - Entity type (note, task, user, export)
- `entityId` - Entity ID

**Query Parameters:**
- `limit` (optional) - Maximum number of logs (default: 50)

**Response:**
```json
{
  "logs": [
    {
      "id": 1234,
      "user_id": 42,
      "entity_type": "note",
      "entity_id": 567,
      "action": "create",
      "ip_address": "192.168.1.100",
      "metadata": {
        "title": "Meeting Notes",
        "hasImages": false,
        "tagCount": 2
      },
      "created_at": "2024-12-12 10:00:00"
    }
  ],
  "entity_type": "note",
  "entity_id": 567,
  "count": 5
}
```

**Example:**
```bash
# Get all audit logs for note ID 567
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/admin/audit-logs/entity/note/567

# Get all audit logs for task ID 123
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/admin/audit-logs/entity/task/123
```

---

### 4. Get Audit Log Statistics

**GET** `/api/admin/audit-logs/stats`

Retrieve aggregate statistics about audit logs.

**Query Parameters:**
- `start_date` (optional) - Start date for statistics (ISO 8601)
- `end_date` (optional) - End date for statistics (ISO 8601)

**Response:**
```json
{
  "total_logs": 15000,
  "recent_activity_24h": 250,
  "by_action": [
    { "action": "view", "count": 8500 },
    { "action": "update", "count": 3200 },
    { "action": "create", "count": 2100 },
    { "action": "delete", "count": 1200 }
  ],
  "by_entity_type": [
    { "entity_type": "note", "count": 10500 },
    { "entity_type": "task", "count": 4200 },
    { "entity_type": "user", "count": 300 }
  ],
  "most_active_users": [
    { "id": 42, "username": "john_doe", "action_count": 850 },
    { "id": 15, "username": "jane_smith", "action_count": 620 }
  ],
  "date_range": {
    "start": "2024-12-01",
    "end": "2024-12-12"
  }
}
```

**Example:**
```bash
# Get all-time statistics
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/admin/audit-logs/stats

# Get statistics for a date range
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/admin/audit-logs/stats?start_date=2024-12-01&end_date=2024-12-12"
```

---

### 5. Export Audit Logs

**GET** `/api/admin/audit-logs/export`

Export audit logs to CSV or JSON format.

**Query Parameters:**
- `format` (optional) - Export format: `json` or `csv` (default: json)
- `user_id` (optional) - Filter by user ID
- `entity_type` (optional) - Filter by entity type
- `entity_id` (optional) - Filter by entity ID
- `action` (optional) - Filter by action
- `start_date` (optional) - Filter by start date
- `end_date` (optional) - Filter by end date
- `limit` (optional) - Maximum number of logs (default: 1000, max: 10000)

**Response:**
- **JSON format**: JSON file with structured data
- **CSV format**: CSV file with columns

**JSON Response:**
```json
{
  "export_date": "2024-12-12T10:30:00.000Z",
  "filters": {
    "user_id": "42",
    "entity_type": "note",
    "action": null,
    "start_date": "2024-12-01",
    "end_date": "2024-12-12"
  },
  "count": 500,
  "logs": [...]
}
```

**CSV Response:**
```csv
ID,User ID,Username,Entity Type,Entity ID,Action,IP Address,User Agent,Metadata,Created At
1234,42,"john_doe",note,567,update,"192.168.1.100","Mozilla/5.0...","{"title":true}",2024-12-12 10:30:00
```

**Example:**
```bash
# Export to JSON
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/admin/audit-logs/export?format=json&limit=1000" \
  -o audit_logs.json

# Export to CSV
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/admin/audit-logs/export?format=csv&limit=1000" \
  -o audit_logs.csv

# Export filtered logs
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/admin/audit-logs/export?format=json&entity_type=note&action=delete&start_date=2024-12-01" \
  -o deleted_notes.json
```

**Note:** The export action itself is logged in the audit log for compliance.

---

### 6. Clean Old Audit Logs

**DELETE** `/api/admin/audit-logs/cleanup`

Delete audit logs older than a specified retention period.

**Query Parameters:**
- `retention_days` (optional) - Number of days to retain (default: 365, minimum: 30)

**Response:**
```json
{
  "message": "Cleaned 1500 audit log entries older than 365 days",
  "deleted_count": 1500,
  "retention_days": 365
}
```

**Example:**
```bash
# Clean logs older than 1 year (default)
curl -X DELETE -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/admin/audit-logs/cleanup

# Clean logs older than 90 days
curl -X DELETE -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/admin/audit-logs/cleanup?retention_days=90"
```

**Note:** The cleanup action is logged for audit trail.

---

## Use Cases

### 1. Investigate Security Incident

```bash
# Find all actions by a suspicious user in the last week
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/admin/audit-logs?user_id=42&start_date=2024-12-05" \
  | jq '.logs[] | select(.ip_address != "192.168.1.100")'
```

### 2. Track Note History

```bash
# See all modifications to a specific note
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/admin/audit-logs/entity/note/567
```

### 3. Generate Compliance Report

```bash
# Export all audit logs for the last quarter
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/admin/audit-logs/export?format=csv&start_date=2024-10-01&end_date=2024-12-31&limit=10000" \
  -o compliance_report_q4_2024.csv
```

### 4. Monitor User Activity

```bash
# Get activity statistics and identify most active users
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/admin/audit-logs/stats?start_date=2024-12-01" \
  | jq '.most_active_users'
```

### 5. Scheduled Cleanup

```bash
# Add to cron job to clean logs older than 1 year monthly
0 2 1 * * curl -X DELETE -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/admin/audit-logs/cleanup?retention_days=365"
```

---

## Performance Considerations

- **Pagination**: Use pagination for large result sets (per_page ≤ 100)
- **Indexes**: Database indexes on user_id, entity_type/id, created_at, action
- **Export limits**: Default 1000, maximum 10000 for performance
- **Date filtering**: Use date ranges for better performance
- **Cleanup**: Schedule regular cleanup to maintain performance

---

## Security Notes

1. **Admin Only**: All endpoints require admin authentication
2. **Audit Trail**: Export and cleanup actions are themselves logged
3. **Rate Limiting**: Consider rate limiting export endpoints
4. **Data Privacy**: Audit logs may contain IP addresses and user agents
5. **Retention**: Follow legal requirements for your jurisdiction

---

## Error Responses

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "error": "Admin access required"
}
```

**400 Bad Request:**
```json
{
  "error": "Retention period must be at least 30 days"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

---

## Related Documentation

- [Audit Logging Implementation](AUDIT_LOGGING_IMPLEMENTATION.md)
- [Data Compliance Investigation](../investigation/DATA_COMPLIANCE_INVESTIGATION.md)
- [Security Policy](SECURITY.md)

---

**Last Updated:** December 12, 2024  
**API Version:** 1.0
