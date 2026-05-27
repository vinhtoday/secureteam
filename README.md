# SecureTeam - He thong nhan tin noi bo doanh nghiep

## Tong quan

SecureTeam la he thong chat doanh nghiep toan dien xay dung tren Next.js 16, React 19, TypeScript, Socket.io, WebRTC va Prisma/SQLite. Ho tro nhom tin nhan, cuoc goi voice/video, quan ly cong viec, AI Agent (SecureBot), va Admin Dashboard.

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16.1 (Turbopack) |
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| UI Library | shadcn/ui (40+ components) |
| State Management | Zustand + TanStack React Query |
| Database | SQLite + Prisma ORM 6.11 |
| Real-time | Socket.io (chat-service port 3004) |
| Video/Audio | WebRTC (STUN/TURN) |
| AI Agent | z-ai-web-dev-sdk (SecureBot) |
| Forms | React Hook Form + Zod 4 |
| Icons | Lucide React |
| Charts | Recharts |
| Animation | Framer Motion |
| Theme | next-themes (dark/light) |

---

## Cai dat va Chay

### Yeu cau
- Node.js 18+ hoac Bun
- SQLite (co san voi Prisma)

### Cai dat

```bash
# 1. Clone va cai dependencies
cd secureteam
bun install
# hoac: npm install

# 2. Cau hinh environment
cp .env.example .env
# Chinh sua .env neu can (DATABASE_URL, JWT_SECRET, etc.)

# 3. Khoi tao database
npx prisma generate
npx prisma db push

# 4. Seed du lieu mau
npx tsx prisma/seed.ts
```

### Chay development

```bash
# Cach 1: Chay ca 2 server (Next.js + chat-service)
chmod +x run-servers.sh
./run-servers.sh

# Cach 2: Chay tung server
# Terminal 1 - Next.js (port 3000)
bun run dev

# Terminal 2 - Chat Service (port 3004)
cd mini-services/chat-service
bun install
bun run index.ts
```

### Chay production

```bash
# Build
bun run build

# Chay
chmod +x start.sh
./start.sh
# hoac: bun run start
```

---

## Cau truc Project

```
secureteam/
├── prisma/
│   ├── schema.prisma          # 18 models (Role, User, Channel, Message, Task, Call, etc.)
│   └── seed.ts                # Seed: 4 roles, 8 users, 7 channels, 17 messages
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (Vietnamese, Plus Jakarta Sans font)
│   │   ├── page.tsx           # SPA - Auth (Login/Register) + Chat + Admin
│   │   ├── globals.css        # Tailwind 4 + custom theme (Emerald/Teal)
│   │   └── api/v1/            # 56 API endpoints
│   │       ├── auth/          # login, register, logout, refresh, me, change-password, 2fa
│   │       ├── users/         # CRUD, online status
│   │       ├── channels/      # CRUD, members, messages, direct
│   │       ├── calls/         # create, join, leave, end, mute, raise-hand, screen-share, recording
│   │       ├── tasks/         # CRUD, bulk-update, assignments, comments, activities, attachments
│   │       ├── labels/        # CRUD (standalone entity)
│   │       ├── notifications/ # CRUD, read, read-all
│   │       ├── search/        # Global search (messages, tasks, users)
│   │       ├── admin/         # dashboard, messages, tasks, calls, export, audit-logs, reports
│   │       ├── bot/           # SecureBot AI chat
│   │       └── upload/        # File upload (10MB max)
│   ├── components/
│   │   ├── auth/              # login-form, register-form, auth-guard
│   │   ├── chat/              # chat-area, chat-sidebar, channel-header, message-input, message-item, member-list, thread-panel, bot-typing-indicator, user-status-badge, create-channel-dialog
│   │   ├── call/              # call-screen, call-controls, call-manager, call-participants, call-chat, incoming-call-dialog, call-history
│   │   ├── task/              # task-view, kanban-board, task-card, task-detail-panel, create-task-dialog
│   │   ├── admin/             # admin-dashboard, user-management, message-viewer, channel-management, audit-log-viewer, export-dialog
│   │   ├── layout/            # app-sidebar, app-header
│   │   ├── search/            # global-search-dialog (Cmd+K)
│   │   ├── notification/      # notification-panel
│   │   ├── ui/                # 47 shadcn/ui components
│   │   └── providers.tsx      # ThemeProvider, QueryClientProvider, AuthInitializer, Toaster
│   ├── hooks/                 # 12 hooks: auth, bot, calls, channels, messages, mobile, notifications, online-users, search, socket, tasks, toast
│   ├── stores/                # 3 Zustand stores: auth-store, call-store, task-store
│   └── lib/
│       ├── db.ts              # Prisma singleton
│       ├── api.ts             # Client-side API wrapper (auto-refresh, token management)
│       ├── api-response.ts    # Server-side response helpers
│       ├── auth.ts            # JWT, bcrypt, AES-256-GCM, TOTP
│       ├── auth-middleware.ts # Route handler auth wrapper
│       ├── rbac-middleware.ts # Role-based access control
│       ├── encryption.ts      # Message encryption (AES-256-GCM + HMAC-SHA256)
│       ├── webrtc.ts          # WebRTC manager (ICE, STUN/TURN, peer connections)
│       ├── notification-helper.ts # Notification creation helpers
│       ├── constants.ts       # Roles, permissions, error codes, limits
│       ├── utils.ts           # cn() utility
│       └── bot/               # SecureBot AI Agent
│           ├── agent.ts       # ReAct agent loop with z-ai-web-dev-sdk
│           ├── system-prompt.ts  # Bot personality + tool definitions
│           └── tool-executor.ts # 8 tools: search_user, get_my_info, list_channels, etc.
├── mini-services/
│   └── chat-service/
│       ├── index.ts           # Socket.io server (port 3004) - 12 call event handlers
│       └── prisma/schema.prisma  # Shared Prisma schema
├── public/
│   ├── uploads/               # File upload directory
│   ├── logo.svg
│   └── robots.txt
├── db/
│   └── custom.db              # SQLite database
├── package.json
├── next.config.ts             # standalone output
├── tailwind.config.ts
├── tsconfig.json
├── Caddyfile                  # Reverse proxy (port 81)
├── run-servers.sh             # Dev: Next.js :3000 + chat-service :3004
└── start.sh                   # Prod: Next.js :3005 + chat-service :3004
```

---

## Database Schema (18 Models)

### Auth & RBAC
- **Role** - SUPER_ADMIN, ADMIN, LEADER, MEMBER (permissions JSON)
- **User** - Full profile, 2FA, online status, department, position
- **Session** - Token-based with device/IP tracking

### Chat & Channels
- **Channel** - public/private/direct, archivable
- **ChannelMember** - role (admin/member), mute, lastReadAt
- **Message** - text/emoji/file/system, reply threading, pin, edit, file attachments
- **ThreadReply** - Thread hierarchy
- **UnreadMessage** - Per-user unread tracking
- **EncryptionKey** - AES-256-GCM per user/channel

### Calls
- **CallRoom** - voice/video/group, duration tracking
- **CallParticipant** - status, mute, camera, screen share, raise hand
- **CallRecording** - audio/video, starter relation

### Task Management
- **Task** - status (todo/in_progress/review/done/cancelled), progress, position, subtasks
- **TaskAssignment** - with assignedBy tracking
- **TaskComment** - with @mentions (JSON)
- **TaskActivity** - full audit trail (oldValue, newValue, metadata)
- **TaskAttachment** - file attachments
- **Label** - standalone entity with creator
- **TaskLabel** - junction table (task <-> label)

### Other
- **Notification** - message/mention/call/task/system types
- **AuditLog** - Action tracking with IP/UserAgent

---

## API Endpoints (56 routes)

### Auth (8)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/login | Login (JWT + refresh token cookie) |
| POST | /api/v1/auth/register | Register |
| POST | /api/v1/auth/logout | Logout (clear all sessions) |
| POST | /api/v1/auth/refresh | Refresh access token |
| GET | /api/v1/auth/me | Current user profile |
| POST | /api/v1/auth/change-password | Change password |
| POST | /api/v1/auth/2fa/setup | Setup 2FA |
| POST | /api/v1/auth/2fa/verify | Verify 2FA |

### Users (3)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/users | List users (ADMIN) |
| GET | /api/v1/users/online | Online/away/busy users |
| GET/PATCH/DELETE | /api/v1/users/[id] | User CRUD |

### Channels (5)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /api/v1/channels | List/Create channels |
| POST | /api/v1/channels/direct | Create DM channel |
| GET | /api/v1/channels/[id] | Channel detail |
| POST | /api/v1/channels/[id]/members | Add member |
| DELETE | /api/v1/channels/[id]/members/[userId] | Remove member |
| GET/POST | /api/v1/channels/[id]/messages | Messages (paginated) |

### Calls (12)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /api/v1/calls | List/Create calls |
| POST | /api/v1/calls/create | Full call creation |
| GET/DELETE | /api/v1/calls/[id] | Call detail / End call |
| POST | /api/v1/calls/[id]/join | Join call |
| POST | /api/v1/calls/[id]/leave | Leave call |
| POST | /api/v1/calls/[id]/end | End call (host/admin) |
| POST | /api/v1/calls/[id]/mute | Mute/unmute |
| POST | /api/v1/calls/[id]/raise-hand | Raise hand |
| POST | /api/v1/calls/[id]/screen-share | Toggle screen share |
| POST | /api/v1/calls/[id]/recording/start | Start recording |
| POST | /api/v1/calls/[id]/recording/stop | Stop recording |
| GET | /api/v1/calls/history | Call history |
| GET | /api/v1/calls/recordings | Recordings list |

### Tasks (8)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /api/v1/tasks | List/Create tasks |
| POST | /api/v1/tasks/bulk-update | Bulk update (Kanban drag-drop) |
| GET/POST/DELETE | /api/v1/tasks/[id]/assignments | Task assignments |
| GET | /api/v1/tasks/[id]/activities | Activity log |
| GET/POST | /api/v1/tasks/[id]/attachments | Attachments |
| GET/POST | /api/v1/tasks/[id]/comments | Comments |
| PATCH/DELETE | /api/v1/tasks/[id]/comments/[commentId] | Edit/Delete comment |

### Labels (2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /api/v1/labels | List/Create labels |
| PATCH/DELETE | /api/v1/labels/[id] | Update/Delete label |

### Notifications (4)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | /api/v1/notifications | List / Mark all read |
| PATCH | /api/v1/notifications/[id] | Update notification |
| PATCH | /api/v1/notifications/[id]/read | Mark read |
| POST | /api/v1/notifications/read-all | Mark all read |

### Other (6)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/search | Global search (Cmd+K) |
| GET | /api/v1/admin/dashboard | Stats + charts |
| GET | /api/v1/admin/messages | All messages (admin) |
| GET | /api/v1/admin/tasks | All tasks (admin) |
| GET | /api/v1/admin/calls | All calls (admin) |
| GET | /api/v1/admin/audit-logs | Audit trail |
| POST | /api/v1/admin/export | Export data |
| GET | /api/v1/admin/reports | Reports |
| POST | /api/v1/bot/chat | SecureBot AI chat |
| POST | /api/v1/upload | File upload (10MB) |

---

## Tinh nang chinh

### 1. Authentication & Security
- JWT access token (15p) + refresh token (7d) trong HttpOnly cookie
- RBAC 4 roles: SUPER_ADMIN, ADMIN, LEADER, MEMBER
- 2FA (TOTP) setup va verify
- AES-256-GCM message encryption + HMAC-SHA256
- Auth middleware cho tat ca API routes
- Password: bcrypt 12 rounds

### 2. Chat & Messaging
- Channel: public, private, direct message
- Real-time qua Socket.io
- Reply threading, message editing, pinning
- Typing indicators
- Emoji picker (40 emojis)
- File upload (10MB, htro: image, PDF, Office, ZIP)
- Unread message tracking
- Global search (Cmd+K) - messages, tasks, users

### 3. Voice & Video Calls
- Voice call, video call, group call
- WebRTC peer-to-peer (STUN/TURN servers)
- Mute, camera on/off, screen sharing
- Raise hand
- In-call chat
- Call recording (admin/leader)
- Call history

### 4. Task Management
- Kanban board (todo/in_progress/review/done)
- Drag-and-drop reorder
- Priority (low/medium/high/urgent)
- Progress tracking (0-100%)
- Subtasks (parent-child)
- Assignees, labels, comments, attachments
- Activity log (full audit trail)
- Bulk update (status, priority, position)
- Due dates, start dates

### 5. SecureBot AI Agent
- ReAct agent loop voi z-ai-web-dev-sdk
- 8 tools: search_user, get_my_info, list_channels, get_channel_info, get_my_tasks, create_task, get_channel_members, get_online_users
- Stream response qua Socket.io
- Tu dong trigger khi @SecureBot hoac DM
- Vietnamese-first personality

### 6. Admin Dashboard
- User management (CRUD, lock/unlock)
- Channel management
- Message viewer (search, filter, export)
- Call history + recordings
- Task overview
- Audit log viewer
- Export data (JSON)
- Stats: users, online, messages, channels

### 7. Notifications
- Real-time notification bell
- Types: message, mention, call, task, system
- Mark read / mark all read
- Toast notifications (sonner)

### 8. UI/UX
- Dark/Light theme
- Responsive (mobile + desktop)
- Plus Jakarta Sans (Vietnamese subset)
- Smooth animations (Framer Motion)
- Loading skeletons
- Custom scrollbars

---

## File Upload

### Cau hinh
- Upload directory: `public/uploads/`
- Max file size: 10MB
- Supported types: image/*, PDF, Office (doc/docx/xls/xlsx/ppt/pptx), ZIP/RAR, TXT, CSV
- File naming: `{timestamp}-{userId}.{ext}` ( tranh trung lap)
- URL format: `/uploads/{uniqueName}`

### API
```typescript
// POST /api/v1/upload
const formData = new FormData()
formData.append('file', fileObject)

const res = await api.post('/api/v1/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
// Response: { url, fileName, fileSize, mimeType }
```

### Frontend
- Nut Paperclip trong MessageInput da enable
- Click -> mo file picker -> upload tu dong -> gui tin nhan file
- Validate: type check + 10MB limit + error toast

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@secureteam.com | Admin@123456 |
| Admin | admin2@secureteam.com | Admin@123456 |
| Leader | leader@secureteam.com | Member@123456 |
| Member | member1-5@secureteam.com | Member@123456 |

---

## Ports

| Service | Port |
|---------|------|
| Next.js (dev) | 3000 |
| Next.js (prod/start.sh) | 3005 |
| Chat Service (Socket.io) | 3004 |
| Caddy Reverse Proxy | 81 |

---

## Environment Variables

```env
# Database
DATABASE_URL="file:./db/custom.db"

# JWT (change in production!)
JWT_SECRET="your-jwt-secret-here"
REFRESH_TOKEN_SECRET="your-refresh-secret-here"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Socket.io Events (chat-service)

### Client -> Server
- `authenticate` - Auth token
- `join-channel` / `leave-channel`
- `send-message` / `typing` / `stop-typing`

### Call Events (12 handlers)
- `call:invite` / `call:accept` / `call:reject` / `call:cancel`
- `call:join` / `call:leave` / `call:end`
- `call:mute` / `call:camera` / `call:screen-share` / `call:raise-hand`
- `call:signal` (WebRTC SDP/ICE)

### Server -> Client
- `online-users` / `user:status`
- `user:typing` / `user:stop-typing`
- `new-message`
- All call events echoed back

---

## Phase 5: Testing, Security & Production Deployment

### Docker Production Architecture

```
                    Internet
                       |
                  [Nginx :80/:443]
                  /              \
            [App :3000]    [Chat :3004]
                |               |
           [SQLite DB]      [Redis :6379]
                |
          [Coturn TURN :3478]
                |
    [Prometheus :9090]  [Grafana :3001]
```

**7 Docker services:**
| Service | Image | Port | Description |
|---------|-------|------|-------------|
| app | Custom (Node 20) | 3000 | Next.js app |
| chat-service | Custom (Node 20) | 3004 | Socket.io server |
| redis | redis:7-alpine | 6379 | Rate limiting, cache, pub/sub |
| nginx | nginx:alpine | 80/443 | Reverse proxy + SSL |
| coturn | coturn/coturn:4.6 | 3478/5349 | WebRTC TURN server |
| prometheus | prom/prometheus | 9090 | Metrics collection |
| grafana | grafana/grafana | 3001 | Dashboards & alerting |

### Production Deploy (Docker Compose)

```bash
# 1. Chuẩn bị production environment
cd docker/
cp .env.production.example .env.production
# Chỉnh sửa: JWT_SECRET, TURN credentials, domain, SSL certs

# 2. Cài SSL certificates (Let's Encrypt)
mkdir -p ssl
certbot certonly --standalone -d secureteam.yourcompany.com
cp /etc/letsencrypt/live/secureteam.yourcompany.com/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/secureteam.yourcompany.com/privkey.pem ssl/key.pem

# 3. Deploy
docker compose --env-file .env.production up -d --build

# 4. Seed database (first time only)
docker compose exec app npx tsx prisma/seed.ts

# 5. Verify
docker compose ps
curl http://localhost:3000/api/v1/health
```

### Security Hardening

#### 1. Rate Limiting (`src/lib/rate-limit.ts`)
- Per-IP per-endpoint rate limiting
- Configurable window (default: 60s) and max requests (default: 100)
- Auto-cleanup expired entries
- Redis-ready for distributed deployment

#### 2. Brute Force Protection (`src/lib/brute-force.ts`)
- 5 failed attempts -> 15 minute lockout
- Tracks by email AND IP
- Auto-reset on successful login
- Configurable thresholds

#### 3. Security Headers (`src/middleware.ts`)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (production)
- `Content-Security-Policy`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Block common attack paths (/.env, /.git, /wp-admin)

#### 4. Nginx Security
- TLSv1.2+ only
- Rate limiting: 10 requests/second per IP
- 20MB max upload size
- Security headers on all responses
- WebSocket upgrade support for Socket.io

### Security Checklist

- [x] JWT token authentication (15min access, 7d refresh)
- [x] HttpOnly cookie for refresh token
- [x] bcrypt 12 rounds password hashing
- [x] RBAC (4 roles with permission hierarchy)
- [x] 2FA (TOTP) support
- [x] AES-256-GCM message encryption
- [x] Rate limiting (per-IP, per-endpoint)
- [x] Brute force protection (5 attempts, 15min lockout)
- [x] Security headers (HSTS, CSP, X-Frame-Options)
- [x] Input validation (Zod schemas on all endpoints)
- [x] SQL injection prevention (Prisma ORM)
- [x] CORS configuration
- [x] Non-root Docker containers
- [x] Docker resource limits
- [x] Blocked attack paths (/.env, /.git, /wp-admin)
- [ ] E2EE for all messages (partial - keys exist)
- [ ] Redis session store (infrastructure ready)
- [ ] Container security scanning (Trivy in CI/CD)
- [ ] SSL certificate rotation automation
- [ ] WAF (Web Application Firewall)

### Testing Infrastructure

**34 tests** across 6 test suites:

#### Unit Tests (24 tests)
| Suite | Tests | Description |
|-------|-------|-------------|
| auth.test.ts | 9 | Password hashing, JWT generation/verification, brute force |
| api-response.test.ts | 10 | All API response helpers (200-500) |
| rate-limit.test.ts | 5 | Rate limiting, isolation by IP/endpoint |

#### Integration Tests (10 tests)
| Suite | Tests | Description |
|-------|-------|-------------|
| auth-api.test.ts | 5 | Register, login, profile, auth failure |
| channels-api.test.ts | 3 | List, create, detail |
| health-api.test.ts | 2 | Health check, root API |

```bash
# Chay unit tests
bunx vitest run tests/unit --reporter=verbose

# Chay integration tests (can server dang chay)
bunx vitest run tests/integration --reporter=verbose

# Chay tat ca + coverage
bunx vitest run --coverage

# Chay single file
bunx vitest run tests/unit/auth.test.ts
```

### CI/CD Pipeline (GitHub Actions)

```
Push to main/develop
    |
    v
[Lint & Type Check] --> [Unit Tests] --> [Integration Tests + Redis]
    |                       |                      |
    v                       v                      v
[Security Scan (Trivy)] --> [Build Docker Images] --> [Deploy to Production]
```

Stages:
1. **Lint** - ESLint check
2. **Unit Tests** - Vitest with V8 coverage
3. **Integration Tests** - Redis service container
4. **Security Scan** - Trivy vulnerability scanner (CRITICAL/HIGH)
5. **Build** - Docker multi-arch images, push to GHCR
6. **Deploy** - SSH to production server, docker compose up

### Monitoring Stack

**Grafana Dashboard panels:**
- System Uptime (UP/DOWN)
- HTTP Requests/sec
- Response Time (p95)
- Memory Usage (gauge)
- Active Users / Active Calls / Socket Connections
- Error Rate (5xx)
- CPU Usage

**Access:**
- Grafana: `http://server:3001` (admin / configured password)
- Prometheus: `http://server:9090`

### Backup Strategy

```bash
# Manual backup
./deploy/backup.sh

# Cron (tu dong hang ngay 2AM)
0 2 * * * /opt/secureteam/deploy/backup.sh >> /var/log/secureteam-backup.log

# Restore
cp /opt/secureteam-backups/db-YYYYMMDD-HHMMSS.bak.gz /opt/secureteam/db/
gunzip /opt/secureteam/db/custom.db.gz
```

Retention: 30 days, auto-cleanup.

### Go-Live Checklist

- [ ] Change all default secrets (JWT, TURN, DB)
- [ ] Configure real domain + SSL certificate
- [ ] Set up DNS records
- [ ] Configure TURN server external IP
- [ ] Set up Redis for production
- [ ] Configure Grafana alerting rules
- [ ] Set up log rotation
- [ ] Configure backup cron job
- [ ] Run full security scan
- [ ] Load test with expected user count
- [ ] Document DR (Disaster Recovery) procedure
- [ ] Create incident response runbook
