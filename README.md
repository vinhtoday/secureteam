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
