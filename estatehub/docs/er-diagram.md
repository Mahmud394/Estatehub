```mermaid
erDiagram
  users ||--o| broker_profiles : "has (brokers)"
  users ||--o{ properties : "lists (brokers)"
  properties ||--o{ property_images : has
  properties ||--o{ comments : receives
  users ||--o{ comments : writes
  users ||--o{ favorites : saves
  properties ||--o{ favorites : "saved in"
  properties ||--o{ conversations : "about"
  users ||--o{ conversations : "client / broker"
  conversations ||--o{ messages : contains
  users ||--o{ messages : sends
  users ||--o{ reviews : "writes (client) / receives (broker)"
  users ||--o{ notifications : receives
  users ||--o{ reports : files
  users ||--o{ audit_logs : "admin actions"

  users {
    int id PK
    string email UK
    string password_hash
    enum role "client|broker|admin"
    enum status "active|suspended"
  }
  broker_profiles {
    int id PK
    int user_id FK
    string company_name
    enum verification_status "pending|approved|rejected"
  }
  properties {
    int id PK
    int broker_id FK
    enum category "land|apartment|house|commercial"
    enum purpose "sale|rent"
    decimal price "BDT"
    decimal size "sqft"
    enum approval_status "pending|approved|rejected"
    enum availability_status "available|sold|rented|unavailable"
  }
```

**Deletion rules:** deleting a user cascades to their profile, properties, comments, favorites and messages. Deleting a property cascades to images, comments and favorites, but keeps its conversations (property_id becomes NULL). Audit logs survive admin deletion (admin_id becomes NULL).
