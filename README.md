# Alkitab-Aljamii Backend

A NestJS backend for an educational content management system with role-based access control, file streaming, and multi-language support.

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL 17 with Prisma 7 ORM
- **Storage**: MinIO (S3-compatible)
- **Authentication**: JWT (access + refresh tokens)
- **Localization**: nestjs-i18n (English/Arabic)

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start PostgreSQL and MinIO
docker compose up -d

# Generate Prisma client
npm run db:generate

# Push schema to database
npx prisma db push

# Seed super admin user
npm run db:seed

# Run in development
npm run start:dev
```

### Available Scripts

```bash
npm run build        # Build for production
npm run start:dev    # Development with hot-reload
npm run start:prod   # Production mode
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed super admin user
npm run db:studio    # Open Prisma Studio
npm run lint         # Run ESLint
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests
```

## Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── controllers/
│   ├── dto/
│   ├── services/
│   └── strategies/
├── users/                   # Users module
│   ├── controllers/
│   ├── dto/
│   └── services/
├── common/                  # Shared utilities
│   ├── decorators/          # @CurrentUser, @Roles, @Public
│   ├── enums/               # UserRole enum
│   ├── filters/             # Global exception filter
│   ├── guards/              # JWT & Roles guards
│   ├── interceptors/        # Logging & Transform
│   └── pagination/          # Pagination helpers
├── config/                  # Configuration module
├── prisma/                  # PrismaModule & PrismaService
├── storage/                 # MinIO service
└── i18n/                    # Translations (en/ar)

prisma/
├── schema/                  # Multi-file Prisma schema
│   ├── base.prisma          # Generator, datasource, enums
│   ├── users.prisma         # User, RefreshToken
│   ├── faculties.prisma     # Faculty, FacultyProfessor, FacultyStudent
│   ├── subjects.prisma      # Subject, UserSubjectAssignment
│   └── contents.prisma      # Content, ContentApproval, ContentAccessLog
├── migrations/              # Database migrations
└── seed/                    # Seed scripts
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/login` | Login with email/password | Public |
| POST | `/auth/refresh` | Refresh access token | Public |
| POST | `/auth/logout` | Logout (revoke token) | Authenticated |

**Login Response:**
```json
{
  "user": { "id", "email", "firstName", "lastName", "role" },
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 900,
  "refreshExpiresIn": 604800
}
```

### Users

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/users/me` | Get current user profile | Authenticated |
| POST | `/users` | Create user | Admin |
| GET | `/users` | List users (filtered by role) | Authenticated |
| GET | `/users/:id` | Get user by ID | Authenticated |
| PATCH | `/users/:id` | Update user | Admin |
| PATCH | `/users/:id/password` | Update password | Admin |
| DELETE | `/users/:id` | Soft delete user | Admin |
| POST | `/users/:id/restore` | Restore deleted user | Admin |

**Query Parameters for GET /users:**
| Param | Description |
|-------|-------------|
| `search` | Search by name/email |
| `role` | Filter by role (super_admin, faculty_admin, professor, student) |
| `isActive` | Filter by active status |
| `facultyId` | Filter by faculty (admin only) |
| `subjectId` | Filter by subject/course |
| `page` | Page number (default: 1) |
| `limit` | Items per page (default: 10, max: 100) |

## Role-Based Access Control

### User Roles

| Role | Description |
|------|-------------|
| `super_admin` | Full system access |
| `faculty_admin` | Manages assigned faculty |
| `professor` | Uploads content, views students in their courses |
| `student` | Views approved content (stream only) |

### Data Visibility by Role

| Role | Can See | Can Modify |
|------|---------|------------|
| `super_admin` | All users | All users (except other super_admins) |
| `faculty_admin` | Users in their faculties | Professors & students in their faculties |
| `professor` | Users in their courses | None (read-only) |
| `student` | Only themselves via `/me` | None |

### Filter Permissions

| Role | Can Filter By |
|------|---------------|
| `super_admin` | faculty, subject, role, search |
| `faculty_admin` | faculty (own), subject (own), role, search |
| `professor` | subject (own courses), search |
| `student` | None |

## Environment Variables

```env
# Application
PORT=8000
NODE_ENV=development

# Database (Prisma)
DATABASE_URL="postgresql://alkitab:alkitab_secret@localhost:5433/alkitab_db?schema=public"

# JWT
JWT_ACCESS_SECRET=your-secret-min-32-chars
JWT_REFRESH_SECRET=your-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9002
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=alkitab-content
```

## Docker Services

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Reset data
docker compose down -v
```

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5433 | Database |
| MinIO API | 9002 | Object storage |
| MinIO Console | 9003 | Web UI (minioadmin/minioadmin) |

### Default Super Admin

After running `npm run db:seed`:

| Field | Value |
|-------|-------|
| Email | admin@alkitab.com |
| Password | Admin@123 |
| Role | super_admin |

## Localization

Set language via headers:
- `x-lang: ar` or `x-lang: en`
- `Accept-Language: ar` or `Accept-Language: en`

Default: English

---

## Implementation Status

### Done

- [x] **Infrastructure**
  - [x] NestJS project setup
  - [x] Prisma 7 ORM with multi-file schema
  - [x] Configuration with Joi validation
  - [x] Docker Compose (PostgreSQL 17 + MinIO)
  - [x] Global exception filter
  - [x] Request logging interceptor
  - [x] Response transform interceptor
  - [x] Pagination utilities

- [x] **Database Schema**
  - [x] Users & RefreshTokens
  - [x] Faculties & memberships (FacultyProfessor, FacultyStudent)
  - [x] Subjects & UserSubjectAssignment
  - [x] Contents, ContentApproval, ContentAccessLog
  - [x] Seed super_admin user

- [x] **Authentication**
  - [x] JWT access/refresh token strategy
  - [x] Secure refresh token storage (bcrypt hashed, DB persisted)
  - [x] Login, refresh, logout endpoints
  - [x] JWT auth guard (global)
  - [x] Roles guard (global)

- [x] **Users Module**
  - [x] CRUD operations
  - [x] `/users/me` endpoint
  - [x] Role-based data filtering
  - [x] Search and filtering (by role, faculty, subject)
  - [x] Pagination

- [x] **Storage**
  - [x] MinIO service integration
  - [x] Upload, stream, delete operations

- [x] **Localization**
  - [x] English translations
  - [x] Arabic translations

### TODO

- [ ] **Faculties Module**
  - [ ] CRUD operations
  - [ ] Assign faculty admin
  - [ ] Manage professors/students

- [ ] **Subjects Module**
  - [ ] CRUD operations
  - [ ] User-Subject assignments

- [ ] **Contents Module**
  - [ ] Content upload (to MinIO)
  - [ ] Content approval/rejection workflow
  - [ ] Stream-only access for students
  - [ ] Access logging

- [ ] **Testing**
  - [ ] Unit tests for services
  - [ ] E2E tests for endpoints

---

## Database Schema

See `architecture.database.mermaid` for the full ERD.

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | All user accounts |
| `refresh_tokens` | JWT refresh tokens (hashed) |
| `faculties` | Academic faculties |
| `faculty_professors` | Professor-faculty assignments (M:N) |
| `faculty_students` | Student-faculty assignments (M:N) |
| `subjects` | Subjects within faculties |
| `user_subject_assignments` | User-subject relationships |
| `contents` | Uploaded educational content |
| `content_approvals` | Approval history |
| `content_access_logs` | Access audit trail |

---

## Contributing

1. Keep all files under 200 lines
2. Split large services/controllers into subdirectories
3. Use the existing pagination and response patterns
4. Add translations for new error messages in `src/i18n/`
5. Follow NestJS conventions

## License

Private - All rights reserved
