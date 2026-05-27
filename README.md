<p align="center">
  <h1 align="center">SecureTeam</h1>
  <p align="center">Enterprise Chat System — Real-time Communication, Video Calls, Task Management & Admin Dashboard</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io" alt="Socket.io" />
  <img src="https://img.shields.io/badge/WebRTC-RTCPeerConnection-FF6B35?logo=webrtc" alt="WebRTC" />
</p>

---

## Features

| Category | Details |
|----------|---------|
| **Authentication** | JWT access/refresh tokens, 4-role RBAC, 2FA (TOTP), bcrypt passwords |
| **Chat & Messaging** | Public/private/DM channels, real-time via Socket.io, reply threading, emoji, file upload (10MB), global search |
| **Voice & Video Calls** | WebRTC P2P (STUN/TURN), mute/camera/screen share, raise hand, group calls, in-call chat |
| **Task Management** | Kanban board, drag-and-drop, priorities, labels, assignees, comments, attachments, activity log, bulk update |
| **AI Bot (SecureBot)** | ReAct agent with 8 tools, streaming responses, @mention triggers, Vietnamese-first |
| **Admin Dashboard** | User management, message viewer, audit logs, stats & charts, data export |
| **Notifications** | Real-time bell, types: message/mention/call/task/system |
| **Security** | HttpOnly cookies, AES-256-GCM, security headers, CSP, blocked attack paths |
| **UI/UX** | Dark/light theme, responsive, Plus Jakarta Sans font, smooth animations |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1 (Turbopack, App Router) |
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| UI | shadcn/ui (30+ components) |
| State | Zustand + TanStack React Query |
| Database | SQLite + Prisma ORM 6.11 |
| Real-time | Socket.io (mini-service port 3004) |
| Voice/Video | WebRTC (STUN/TURN) |
| AI | z-ai-web-dev-sdk |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |

---

## Getting Started

### Prerequisites

- Node.js 20+ or Bun
- SQLite (included via Prisma)
- TURN server credentials (get free ones at [metered.ca](https://www.metered.ca/tools/openrelay))

### Installation

```bash
# 1. Clone and install dependencies
git clone https://github.com/vinhtoday/secureteam.git
cd secureteam
bun install

# 2. Configure environment
cp .env.example .env
# Edit .env — set JWT secrets and TURN credentials

# 3. Initialize database
npx prisma generate
npx prisma db push

# 4. Seed sample data
bun run seed
```

### Development

```bash
# Terminal 1 — Next.js (port 3000)
bun run dev

# Terminal 2 — Chat Service (port 3004)
cd mini-services/chat-service
bun install
bun run index.ts
```

### Production

```bash
# Build
bun run build

# Run (standalone)
bun run start
```

### Docker

```bash
cd docker
cp .env.production.example .env.production
# Edit secrets, domain, SSL certs
docker compose --env-file .env.production up -d --build

# Seed database (first time)
docker compose exec app npx tsx prisma/seed.ts
```

---

## Project Structure

```
secureteam/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # SPA (Auth + Chat + Admin)
│   │   ├── globals.css             # Tailwind 4 + custom theme
│   │   └── api/v1/                 # REST API endpoints
│   │       ├── auth/               # login, register, logout, refresh, me, 2fa
│   │       ├── users/              # CRUD, online status
│   │       ├── channels/           # CRUD, members, messages, DMs
│   │       ├── calls/              # create, join, leave, end, mute, screen-share, recording
│   │       ├── tasks/              # CRUD, bulk-update, assignments, comments, attachments
│   │       ├── labels/             # CRUD
│   │       ├── notifications/      # CRUD, read, read-all
│   │       ├── search/             # Global search
│   │       ├── admin/              # dashboard, messages, tasks, calls, audit-logs, export
│   │       └── bot/                # SecureBot AI
│   ├── components/
│   │   ├── auth/                   # Login & register forms
│   │   ├── chat/                   # Chat UI (sidebar, messages, channels, threads)
│   │   ├── call/                   # Call UI (screen, controls, manager, incoming dialog)
│   │   ├── task/                   # Task UI (detail panel, card, create dialog)
│   │   ├── admin/                  # Admin UI (dashboard, users, messages, audit logs)
│   │   ├── ui/                     # shadcn/ui components (30+)
│   │   └── providers.tsx           # Theme, QueryClient, Toaster
│   ├── hooks/                      # React Query hooks (auth, channels, messages, tasks, calls, etc.)
│   ├── stores/                     # Zustand stores (auth, call, task)
│   ├── lib/
│   │   ├── db.ts                   # Prisma singleton
│   │   ├── api.ts                  # Client API wrapper (auto token refresh)
│   │   ├── auth.ts                 # JWT, bcrypt, TOTP
│   │   ├── auth-middleware.ts      # Route handler auth wrapper
│   │   ├── rbac-middleware.ts      # Role-based access control
│   │   ├── webrtc.ts               # WebRTC manager (ICE, peer connections, signaling)
│   │   ├── helpers.ts              # Shared UI helpers (getInitials, priorities, dates)
│   │   ├── notification-helper.ts  # Notification helpers
│   │   ├── constants.ts            # Error codes, limits
│   │   ├── utils.ts                # cn() utility
│   │   └── bot/                    # SecureBot AI agent
├── mini-services/
│   └── chat-service/index.ts       # Socket.io server (12 call event handlers)
├── prisma/
│   ├── schema.prisma               # 18 database models
│   └── seed.ts                     # Seed data
├── docker/                         # Docker Compose, Nginx, Coturn configs
├── deploy/                         # Deploy & backup scripts
├── monitoring/                     # Prometheus + Grafana configs
├── tests/                          # Unit & integration tests
└── public/                         # Static assets
```

---

## Database Schema (18 Models)

### Auth & RBAC
- **Role** — SUPER_ADMIN, ADMIN, LEADER, MEMBER with JSON permissions
- **User** — Full profile, 2FA, online status, department, position
- **Session** — Token-based with device/IP tracking

### Chat & Channels
- **Channel** — public, private, direct message
- **ChannelMember** — role, mute, lastReadAt
- **Message** — text/emoji/file/system, reply threading, pin, edit, file attachments
- **ThreadReply** — Thread hierarchy
- **UnreadMessage** — Per-user unread tracking
- **EncryptionKey** — AES-256-GCM per user/channel

### Calls
- **CallRoom** — voice, video, group_voice, group_video, duration tracking
- **CallParticipant** — status, mute, camera, screen share, raise hand
- **CallRecording** — audio/video recording with starter relation

### Task Management
- **Task** — 5 statuses, 4 priorities, progress, subtasks, position
- **TaskAssignment** — with assignedBy tracking
- **TaskComment** — with @mentions
- **TaskActivity** — full audit trail
- **TaskAttachment** — file attachments
- **Label** — standalone entity with color
- **TaskLabel** — junction table

### Other
- **Notification** — message, mention, call, task, system types
- **AuditLog** — Action tracking with IP/UserAgent

---

## API Endpoints

### Auth (8)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login (JWT + refresh cookie) |
| POST | `/api/v1/auth/register` | Register |
| POST | `/api/v1/auth/logout` | Logout (clear sessions) |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Current user profile |
| POST | `/api/v1/auth/change-password` | Change password |
| POST | `/api/v1/auth/2fa/setup` | Setup 2FA |
| POST | `/api/v1/auth/2fa/verify` | Verify 2FA |

### Users (3)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List users (admin) |
| GET | `/api/v1/users/online` | Online users |
| GET/PATCH/DELETE | `/api/v1/users/[id]` | User CRUD |

### Channels (6)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/channels` | List/Create channels |
| POST | `/api/v1/channels/direct` | Create DM channel |
| GET | `/api/v1/channels/[id]` | Channel detail |
| POST | `/api/v1/channels/[id]/members` | Add member |
| DELETE | `/api/v1/channels/[id]/members/[userId]` | Remove member |
| GET/POST | `/api/v1/channels/[id]/messages` | Messages (paginated) |

### Calls (12)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/calls` | List/Create calls |
| POST | `/api/v1/calls/create` | Full call creation |
| GET/DELETE | `/api/v1/calls/[id]` | Detail / End call |
| POST | `/api/v1/calls/[id]/join` | Join call |
| POST | `/api/v1/calls/[id]/leave` | Leave call |
| POST | `/api/v1/calls/[id]/end` | End call |
| POST | `/api/v1/calls/[id]/mute` | Toggle mute |
| POST | `/api/v1/calls/[id]/screen-share` | Toggle screen share |
| POST | `/api/v1/calls/[id]/raise-hand` | Raise hand |
| POST | `/api/v1/calls/[id]/recording/start` | Start recording |
| POST | `/api/v1/calls/[id]/recording/stop` | Stop recording |
| GET | `/api/v1/calls/history` | Call history |

### Tasks (8), Labels (2), Notifications (4), Admin (7), Search (1), Bot (1)

See source code for full endpoint listing.

---

## Socket.io Events

### Client → Server
| Event | Description |
|-------|-------------|
| `authenticate` | JWT token auth |
| `join-channel` / `leave-channel` | Channel presence |
| `send-message` / `typing` / `stop-typing` | Messaging |
| `call:invite` / `call:accept` / `call:reject` / `call:cancel` | Call lifecycle |
| `call:join` / `call:leave` / `call:end` | Call presence |
| `call:mute` / `call:camera` / `call:screen-share` / `call:raise-hand` | Call controls |
| `call:signal` | WebRTC SDP/ICE signaling |

### Server → Client
| Event | Description |
|-------|-------------|
| `online-users` / `user:status` | Presence updates |
| `user:typing` / `user:stop-typing` | Typing indicators |
| `new-message` | New message notification |
| All call events | Echoed back to participants |

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@secureteam.com` | `Admin@123456` |
| Admin | `admin2@secureteam.com` | `Admin@123456` |
| Leader | `leader@secureteam.com` | `Member@123456` |
| Member | `member1@secureteam.com` | `Member@123456` |

---

## Ports

| Service | Port |
|---------|------|
| Next.js (dev) | 3000 |
| Next.js (prod) | 3005 |
| Chat Service (Socket.io) | 3004 |
| Nginx Reverse Proxy | 80/443 |

---

## Environment Variables

```env
# Database
DATABASE_URL=file:./db/custom.db

# JWT Secrets (MUST set in production)
JWT_SECRET=your-super-secret-jwt-key
REFRESH_TOKEN_SECRET=your-super-secret-refresh-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
SOCKET_PORT=3004

# TURN Server (for WebRTC — get free credentials at metered.ca)
NEXT_PUBLIC_TURN_USERNAME=
NEXT_PUBLIC_TURN_CREDENTIAL=
```

---

## Security

- JWT access (15min) + refresh (7d) in HttpOnly cookie
- bcrypt 12 rounds password hashing
- RBAC: 4 roles with permission hierarchy
- 2FA (TOTP) support
- AES-256-GCM message encryption keys
- Security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- Blocked attack paths: `/.env`, `/.git`, `/wp-admin`
- Non-root Docker containers with resource limits
- Prisma ORM (SQL injection prevention)

---

## Docker Architecture

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

| Service | Port | Description |
|---------|------|-------------|
| app | 3000 | Next.js application |
| chat-service | 3004 | Socket.io real-time server |
| redis | 6379 | Cache, rate limiting |
| nginx | 80/443 | Reverse proxy + SSL |
| coturn | 3478 | WebRTC TURN server |
| prometheus | 9090 | Metrics |
| grafana | 3001 | Dashboards |

---

## License

MIT
