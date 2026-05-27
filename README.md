# SecureTeam - Nền tảng Chat & Quản lý Doanh nghiệp

<p align="center">
  <strong>Hệ thống nhắn tin nội bộ bảo mật cao</strong><br>
  Real-time messaging, Voice/Video Call, Kanban Task Management, E2EE Encryption, Audit Logging
</p>

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Tech Stack](#tech-stack)
- [Kiến trúc hệ thống](#kiến-trúc-hệ thống)
- [Yêu cầu cài đặt](#yêu-cầu-cài-đặt)
- [Hướng dẫn cài đặt](#hướng-dẫn-cài-đặt)
  - [Bước 1: Clone repository](#bước-1-clone-repository)
  - [Bước 2: Cài đặt dependencies](#bước-2-cài-đặt-dependencies)
  - [Bước 3: Cấu hình môi trường](#bước-3-cấu-hình-môi-trường)
  - [Bước 4: Thiết lập Database](#bước-4-thiết-lập-database)
  - [Bước 5: Seed dữ liệu mẫu](#bước-5-seed-dữ-liệu-mẫu)
  - [Bước 6: Khởi động ứng dụng](#bước-6-khởi-động-ứng-dụng)
  - [Bước 7: Truy cập ứng dụng](#bước-7-truy-cập-ứng-dụng)
- [Tài khoản đăng nhập](#tài-khoản-đăng-nhập)
- [Cấu trúc dự án](#cấu-trúc-dự án)
- [API Endpoints](#api-endpoints)
- [Socket Events](#socket-events)
- [Tính năng chính](#tính-năng-chính)
- [Phát triển & Build](#phát-triển--build)
- [Lưu ý bảo mật](#lưu-ý-bảo-mật)

---

## Tổng quan

**SecureTeam** là nền tảng hợp tác nội bộ doanh nghiệp, tích hợp đầy đủ các tính năng:

- **Nhắn tin real-time** — Kênh chat công khai, nhóm, tin nhắn riêng, thread reply
- **Voice/Video Call** — Gọi thoại, video call, screen share, ghi âm, raise hand
- **Quản lý Task (Kanban)** — Bảng Kanban, gán người, deadline, label, comment, đính kèm file
- **Mã hóa E2EE** — AES-256-GCM + HMAC-SHA256, khóa cho từng user
- **Hệ thống Audit** — Ghi log bất biến mọi thao tác, dashboard giám sát
- **RBAC** — 4 cấp quyền: Super Admin, Admin, Leader, Member
- **Thông báo real-time** — Task, mention, deadline, call, system
- **Global Search** — Tìm kiếm toàn bộ messages, tasks, users

---

## Tech Stack

| Lớp | Công nghệ |
|-----|-----------|
| **Framework** | Next.js 16 (App Router, Standalone Output) |
| **Frontend** | React 19, TypeScript, Tailwind CSS 4 |
| **UI Components** | shadcn/ui (40+ components), Lucide Icons |
| **State Management** | Zustand, TanStack Query |
| **Database** | SQLite (via Prisma ORM) |
| **Realtime** | Socket.io v4 (port 3004) |
| **Authentication** | JWT (access + refresh token), bcryptjs |
| **Encryption** | AES-256-GCM + HMAC-SHA256, 2FA TOTP |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts |
| **Drag & Drop** | @dnd-kit |
| **Markdown** | @mdxeditor/editor, react-markdown |
| **Package Manager** | Bun |
| **Reverse Proxy** | Caddy (port 81) |

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                     Caddy (Port 81)                      │
│            Reverse Proxy + Transform Port Query          │
└─────────────┬───────────────────────────┬───────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────┐  ┌──────────────────────────┐
│   Next.js App (3000)    │  │  Socket.io Server (3004) │
│   ─────────────────     │  │  ────────────────────    │
│   • API Routes (REST)   │  │  • Message relay         │
│   • SSR Pages           │  │  • Presence tracking     │
│   • Static Assets       │  │  • Call signaling        │
│   • JWT Auth            │  │  • Typing indicators     │
│   • Prisma ORM          │  │  • Task/Notification     │
└──────────┬──────────────┘  └──────────┬───────────────┘
           │                            │
           ▼                            ▼
┌─────────────────────────────────────────────────────────┐
│                  SQLite (custom.db)                      │
│        Prisma ORM — 21 Models, Full CRUD                 │
└─────────────────────────────────────────────────────────┘
```

**Luồng kết nối Socket.io:**
- Client kết nối tới `https://domain/?XTransformPort=3004`
- Caddy chuyển hướng request sang `localhost:3004` thông qua plugin `@transform_port_query`
- Điều này cho phép Socket.io và Next.js chia sẻ cùng 1 domain (tránh CORS)

---

## Yêu cầu cài đặt

### Bắt buộc

| Công cụ | Phiên bản tối thiểu | Cài đặt |
|---------|---------------------|---------|
| **Node.js** | 18.17+ | [nodejs.org](https://nodejs.org/) |
| **Bun** | 1.0+ | `npm install -g bun` hoặc [bun.sh](https://bun.sh/) |
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com/) |
| **Caddy** | 2.0+ (build với module `@transform_port_query`) | Xem chi tiết bên dưới |

### Khuyến nghị

| Công cụ | Mục đích |
|---------|----------|
| **VS Code** | Editor + extensions (ESLint, Tailwind, Prisma) |
| **Prisma VS Code Extension** | Xem & chỉnh schema trực quan |
| **Tailwind CSS IntelliSense** | Autocomplete CSS classes |

### Lưu ý về Caddy

Caddy cần được build với module `@transform_port_query` để hoạt động. Nếu bạn **không có Caddy custom**, bạn có thể chạy trực tiếp **không cần Caddy** (xem Bước 6).

---

## Hướng dẫn cài đặt

### Bước 1: Clone repository

```bash
git clone https://github.com/vinhtoday/secureteam.git
cd secureteam
```

### Bước 2: Cài đặt dependencies

```bash
bun install
```

Lệnh này sẽ cài đặt toàn bộ dependencies từ `package.json`. Thời gian khoảng 30-60 giây tùy tốc độ mạng.

> **Lưu ý:** Nếu dùng npm: `npm install`. Nếu dùng pnpm: `pnpm install`.

### Bước 3: Cấu hình môi trường

Tạo file `.env` trong thư mục gốc:

```bash
cp .env.example .env
```

Hoặc tạo thủ công với nội dung sau:

```env
# ============================
# DATABASE
# ============================
# SQLite - đường dẫn đến file database
DATABASE_URL="file:./db/custom.db"

# ============================
# JWT AUTHENTICATION
# ============================
# Đổi thành chuỗi random phức tạp trong production!
# Sinh random: openssl rand -hex 32
JWT_SECRET="change-me-to-random-32-chars-in-production"
REFRESH_TOKEN_SECRET="change-me-another-random-string-here"

# ============================
# SERVER
# ============================
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3004"
PORT=3000

# ============================
# ENCRYPTION (E2EE)
# ============================
# Master key cho Super Admin - ĐỔI trong production!
# Sinh random: openssl rand -hex 32
ENCRYPTION_MASTER_KEY="change-me-master-key-in-production"
```

> **Cảnh báo:** Tuyệt đối KHÔNG commit file `.env` vào Git. File này đã được thêm vào `.gitignore`.

### Bước 4: Thiết lập Database

Tạo thư mục database và khởi tạo Prisma:

```bash
# Tạo thư mục chứa database
mkdir -p db

# Generate Prisma Client
bunx prisma generate

# Push schema vào database (tạo bảng)
bunx prisma db push
```

Lệnh `db push` sẽ đọc file `prisma/schema.prisma` và tạo toàn bộ 21 bảng trong SQLite.

**Kết quả mong đợi:**
```
Your database is now in sync with your Prisma schema.
```

### Bước 5: Seed dữ liệu mẫu

```bash
bun run prisma/seed.ts
```

Lệnh này sẽ tạo:
- **3 tài khoản** (1 Super Admin + 1 Member + 1 Leader)
- **5 kênh chat** (3 public + 2 DM)
- **11 tin nhắn mẫu**
- **8 tasks** (Kanban)
- **6 labels** (Bug, Feature, UI/UX, Backend, Frontend, Docs)
- **10 task assignments**
- **5 notifications**

### Bước 6: Khởi động ứng dụng

Bạn cần chạy **2 dịch vụ** song song: Next.js App và Socket.io Server.

#### Cách 1: Chạy trực tiếp (Không cần Caddy - Khuyến nghị cho dev)

Mở **2 terminal** riêng biệt:

**Terminal 1 — Next.js App (port 3000):**
```bash
bun run dev
```

**Terminal 2 — Socket.io Server (port 3004):**
```bash
cd mini-services/chat-service
bun --hot index.ts
```

#### Cách 2: Chạy bằng Caddy (Giống production)

**Terminal 1 — Caddy (port 81):**
```bash
caddy run --config Caddyfile
```

**Terminal 2 — Next.js App (port 3000):**
```bash
bun run dev
```

**Terminal 3 — Socket.io Server (port 3004):**
```bash
cd mini-services/chat-service
bun --hot index.ts
```

Truy cập qua: `http://localhost:81`

#### Cách 3: Chạy tất cả bằng 1 script

Tạo file `start.sh` và chạy:

```bash
#!/bin/bash
# Khởi động toàn bộ hệ thống

# Socket.io Server (background)
cd mini-services/chat-service
bun --hot index.ts &
SOCKET_PID=$!

# Next.js App (foreground)
cd ../..
bun run dev

# Khi Ctrl+C, cleanup
kill $SOCKET_PID 2>/dev/null
```

```bash
chmod +x start.sh
./start.sh
```

### Bước 7: Truy cập ứng dụng

Mở trình duyệt và truy cập:

```
http://localhost:3000
```

> **Lưu ý:** Nếu dùng Caddy, truy cập `http://localhost:81`

---

## Tài khoản đăng nhập

Sau khi seed database, sử dụng các tài khoản sau:

| Vai trò | Email | Mật khẩu | Tên | Phòng ban |
|---------|-------|----------|-----|-----------|
| **Super Admin** | `admin@secureteam.com` | `Admin@123456` | Admin | Engineering (CTO) |
| **Member** | `member1@secureteam.com` | `Member@123456` | Minh Anh | Engineering (Senior Dev) |
| **Leader** | `member2@secureteam.com` | `Member@123456` | Hoang Nam | Design (Lead Designer) |

> **Mẹo:** Mở 2-3 browser window (hoặc incognito) để đăng nhập các tài khoản khác nhau, test tính năng chat real-time và call.

---

## Cấu trúc dự án

```
secureteam/
├── prisma/
│   ├── schema.prisma          # Database schema (21 models)
│   └── seed.ts                # Seed data (3 users, 8 tasks, 5 channels)
├── db/
│   └── custom.db              # SQLite database file
├── mini-services/
│   └── chat-service/
│       └── index.ts           # Socket.io server (port 3004)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (fonts, providers)
│   │   ├── page.tsx           # Single-page app (main entry)
│   │   └── globals.css        # CSS variables, dark/light theme
│   ├── components/
│   │   ├── auth/              # Login, Register, AuthGuard
│   │   ├── chat/              # ChatArea, Sidebar, Messages, Threads
│   │   ├── call/              # CallManager, CallScreen, CallControls
│   │   ├── task/              # KanbanBoard, TaskCard, TaskDetail
│   │   ├── admin/             # Dashboard, UserManagement, AuditLog
│   │   ├── notification/      # NotificationPanel
│   │   ├── search/            # GlobalSearchDialog
│   │   ├── layout/            # AppHeader, AppSidebar
│   │   ├── providers.tsx      # Theme + Query + Auth + Toaster
│   │   └── ui/                # shadcn/ui components (40+)
│   ├── hooks/
│   │   ├── use-auth.ts        # Auth convenience
│   │   ├── use-socket.ts      # Socket.io connection manager
│   │   ├── use-channels.ts    # Channel CRUD (TanStack Query)
│   │   ├── use-messages.ts    # Message operations
│   │   ├── use-calls.ts       # Call room operations
│   │   ├── use-tasks.ts       # Task CRUD, comments
│   │   ├── use-notifications.ts
│   │   ├── use-online-users.ts
│   │   ├── use-search.ts
│   │   └── use-admin.ts
│   ├── stores/
│   │   ├── auth-store.ts      # Zustand — auth state
│   │   ├── call-store.ts      # Zustand — call state
│   │   └── task-store.ts      # Zustand — task filters/view
│   └── lib/
│       ├── auth.ts            # JWT, bcrypt, AES-256-GCM, 2FA
│       ├── auth-middleware.ts  # withAuth() HOF
│       ├── rbac-middleware.ts # Role-based access control
│       ├── api.ts             # HTTP client + token refresh
│       ├── db.ts              # Prisma client singleton
│       ├── encryption.ts      # E2EE (AES-256-GCM + HMAC)
│       ├── constants.ts       # Roles, permissions, enums
│       ├── notification-helper.ts
│       └── utils.ts           # cn() utility
├── public/
│   └── logo.svg
├── upload/                     # Uploaded files (images, docs)
├── .env                       # Environment variables (KHÔNG commit)
├── .gitignore
├── Caddyfile                  # Caddy reverse proxy config
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/v1/auth/login` | Đăng nhập → JWT + refresh token |
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản mới |
| `POST` | `/api/v1/auth/logout` | Đăng xuất, xóa session |
| `POST` | `/api/v1/auth/refresh` | Làm mới access token |
| `GET` | `/api/v1/auth/me` | Thông tin user hiện tại |
| `POST` | `/api/v1/auth/change-password` | Đổi mật khẩu |
| `POST` | `/api/v1/auth/2fa/setup` | Thiết lập 2FA |
| `POST` | `/api/v1/auth/2fa/verify` | Xác minh 2FA |

### Users

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/users` | Danh sách users |
| `GET` | `/api/v1/users/[id]` | Chi tiết user |
| `GET` | `/api/v1/users/online` | Users đang online |

### Channels

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/channels` | Danh sách channels |
| `POST` | `/api/v1/channels` | Tạo channel mới |
| `GET` | `/api/v1/channels/[id]` | Chi tiết channel |
| `PATCH` | `/api/v1/channels/[id]` | Cập nhật channel |
| `GET` | `/api/v1/channels/[id]/messages` | Tin nhắn trong channel |
| `POST` | `/api/v1/channels/[id]/messages` | Gửi tin nhắn |
| `GET/POST` | `/api/v1/channels/[id]/members` | Quản lý thành viên |
| `POST` | `/api/v1/channels/direct` | Tạo tin nhắn riêng |

### Calls

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/v1/calls/create` | Tạo phòng call |
| `POST` | `/api/v1/calls/[id]/join` | Tham gia call |
| `POST` | `/api/v1/calls/[id]/leave` | Rời call |
| `POST` | `/api/v1/calls/[id]/end` | Kết thúc call |
| `POST` | `/api/v1/calls/[id]/mute` | Bật/tắt mic |
| `POST` | `/api/v1/calls/[id]/screen-share` | Chia sẻ màn hình |
| `GET` | `/api/v1/calls/history` | Lịch sử cuộc gọi |

### Tasks

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/tasks` | Danh sách tasks (filter/sort) |
| `POST` | `/api/v1/tasks` | Tạo task mới |
| `GET/PATCH/DELETE` | `/api/v1/tasks/[id]` | CRUD task |
| `GET/POST` | `/api/v1/tasks/[id]/comments` | Comments |
| `GET/POST` | `/api/v1/tasks/[id]/assignments` | Gán người |
| `GET/POST` | `/api/v1/tasks/[id]/attachments` | Đính kèm file |
| `POST` | `/api/v1/tasks/bulk-update` | Cập nhật hàng loạt |

### Notifications

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/notifications` | Danh sách thông báo |
| `PATCH` | `/api/v1/notifications/[id]` | Đọc thông báo |
| `POST` | `/api/v1/notifications/read-all` | Đọc tất cả |

### Admin

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/admin/dashboard` | Dashboard thống kê |
| `GET` | `/api/v1/admin/users` | Quản lý users |
| `GET` | `/api/v1/admin/messages` | Xem tin nhắn |
| `GET` | `/api/v1/admin/audit-logs` | Audit log |
| `POST` | `/api/v1/admin/export` | Xuất báo cáo |

### Other

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/search` | Tìm kiếm toàn cục |

---

## Socket Events

### Authentication

| Event | Direction | Mô tả |
|-------|-----------|-------|
| `authenticate` | Client → Server | Gửi JWT token xác thực |

### Messaging

| Event | Direction | Mô tả |
|-------|-----------|-------|
| `join-channel` | Client → Server | Tham gia kênh |
| `leave-channel` | Client → Server | Rời kênh |
| `send-message` | Client → Server | Gửi tin nhắn |
| `typing` | Client → Server | Đang gõ |
| `stop-typing` | Client → Server | Ngừng gõ |
| `message:read` | Client → Server | Đánh dấu đã đọc |
| `new-message` | Server → Client | Tin nhắn mới |
| `user-typing` | Server → Client | User đang gõ |

### Presence

| Event | Direction | Mô tả |
|-------|-----------|-------|
| `user:status-update` | Client → Server | Cập nhật trạng thái |
| `user:status` | Server → Client | Thay đổi trạng thái user |
| `online-users` | Server → Client | Danh sách online |

### Calls

| Event | Direction | Mô tả |
|-------|-----------|-------|
| `call:invite` | Server → Client | Lời mời gọi |
| `call:accept` | Client → Server | Chấp nhận call |
| `call:reject` | Client → Server | Từ chối call |
| `call:cancel` | Client → Server | Hủy call |
| `call:join` | Client → Server | Tham gia call |
| `call:leave` | Client → Server | Rời call |
| `call:mute` | Client → Server | Bật/tắt mic |
| `call:screen-share` | Client → Server | Chia sẻ màn hình |
| `call:raise-hand` | Client → Server | Giơ tay |
| `call:end` | Client → Server | Kết thúc call |
| `call:signal` | Bidirectional | WebRTC signaling |

### Tasks & Notifications

| Event | Direction | Mô tả |
|-------|-----------|-------|
| `task:update` | Bidirectional | Cập nhật task |
| `task:comment` | Bidirectional | Comment task |
| `task:assign` | Bidirectional | Gán task |
| `notification:send` | Server → Client | Gửi thông báo |

---

## Tính năng chính

### Chat Real-time
- Kênh chat công khai, nhóm private, tin nhắn riêng (DM)
- Thread reply — trả lời theo luồng
- Typing indicators — hiển thị "đang gõ..."
- Đọc/trạng thái đã xem
- Upload file & hình ảnh
- Markdown formatting + code syntax highlight

### Voice / Video Call
- Gọi thoại 1-1 và nhóm
- Video call với toggle camera
- Screen share
- Mute/Unmute mic
- Raise hand
- Ghi âm cuộc gọi
- WebRTC signaling qua Socket.io

### Task Management (Kanban)
- Bảng Kanban: To Do, In Progress, Review, Done, Cancelled
- Drag & drop thay đổi trạng thái
- Priority: Critical, High, Medium, Low
- Gán người thực hiện
- Deadline tracking
- Labels & màu sắc
- Comment với @mention
- Đính kèm file
- Activity log theo task

### Mã hóa E2EE
- AES-256-GCM encryption
- HMAC-SHA256 signature verification
- Per-user encryption keys
- 2FA TOTP support
- Client-side decryption only

### Audit & Monitoring
- Ghi log bất biến (immutable)
- Theo dõi: đăng nhập, xem tin nhắn, thao tác admin
- Dashboard với filter/search
- Export báo cáo (Excel/PDF)
- Alert thao tác nhạy cảm

### RBAC — Phân quyền

| Level | Role | Quyền |
|-------|------|-------|
| 4 | **SUPER_ADMIN** | Toàn quyền, xóa user, quản lý roles, master key |
| 3 | **ADMIN** | Quản lý users, xem messages, audit, export |
| 2 | **LEADER** | Quản lý channels, gán tasks |
| 1 | **MEMBER** | Chat, tạo task, xem dashboard cá nhân |

---

## Phát triển & Build

### Commands phổ biến

```bash
# Cài dependencies
bun install

# Chạy development (port 3000)
bun run dev

# Build production
bun run build

# Chạy production
bun run start

# Database
bunx prisma generate          # Generate Prisma Client
bunx prisma db push           # Push schema to DB
bunx prisma db push --force-reset  # Reset database
bun run seed                  # Seed data

# Lint
bun run lint
```

### Xem Prisma Studio (GUI quản lý database)

```bash
bunx prisma studio
```

Mở `http://localhost:5555` để xem & chỉnh sửa data trực quan.

### Reset toàn bộ database

```bash
# Xóa database và tạo lại từ đầu
rm -f db/custom.db
bunx prisma db push
bun run prisma/seed.ts
```

---

## Lưu ý bảo mật

### BẮT BUỘC trước khi deploy production:

1. **Đổi JWT Secret** — Sinh random string mạnh:
   ```bash
   openssl rand -hex 32
   ```
2. **Đổi Encryption Master Key** — Tương tự:
   ```bash
   openssl rand -hex 32
   ```
3. **Tắt debug logs** — Trong `src/lib/db.ts`, set `log: []` cho Prisma
4. **Bật HTTPS** — Caddy tự động handle Let's Encrypt
5. **Giới hạn CORS** — Chỉ cho phép domain của bạn
6. **File `.env`** — Tuyệt đối không commit lên Git
7. **Database backup** — Sao lưu `db/custom.db` định kỳ
8. **Tạo `.env.example`** — Template cho team (không chứa giá trị thật)

### Cấu hình `.env.example` (đã có trong project):

```env
DATABASE_URL="file:./db/custom.db"
JWT_SECRET="your-random-secret-here"
REFRESH_TOKEN_SECRET="your-random-secret-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3004"
ENCRYPTION_MASTER_KEY="your-master-key-here"
```

---

## Ports Summary

| Port | Service | Protocol |
|------|---------|----------|
| `81` | Caddy Reverse Proxy | HTTP |
| `3000` | Next.js App | HTTP |
| `3004` | Socket.io Server | WebSocket + Polling |
| `5555` | Prisma Studio | HTTP (dev only) |

---

## Troubleshooting

### Lỗi thường gặp

**1. `Error: Cannot find module '@prisma/client'`**
```bash
bunx prisma generate
```

**2. Socket.io không kết nối được**
- Đảm bảo Socket.io server đang chạy (port 3004)
- Kiểm tra Caddy config nếu dùng proxy
- Nếu không dùng Caddy, đảm bảo client connect tới đúng port

**3. Database locked**
- Đảm bảo chỉ 1 Prisma connection đang ghi
- Đóng Prisma Studio nếu đang mở

**4. `bcrypt` build error trên ARM/M1 Mac**
```bash
bun add bcryptjs  # Dùng pure JS thay thế
```

**5. Port 3000 đang được sử dụng**
```bash
# Tìm process đang dùng port 3000
lsof -i :3000
# Kill process
kill -9 <PID>
```

---

## License

Private — All rights reserved.
