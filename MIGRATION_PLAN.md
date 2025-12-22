# Implementation Plan: Full Next.js Rewrite of EmpowerHub Web App

## Overview
Convert the Laravel Blade + Alpine.js tenant web application to a modern Next.js 14+ frontend. Laravel remains as the API backend. This creates a faster, more maintainable, and scalable application.

## Current State
| Component | Count |
|-----------|-------|
| Blade Templates | 381 files |
| Tenant Views | 216 files |
| JavaScript (Alpine.js) | 17 files, 11,321 lines |
| API Endpoints | 100+ endpoints |
| Real-time Channels | 3 (appointments, chat, user) |

## Architecture Decision

```
┌─────────────────────────────────────────────────────────────┐
│                        CURRENT                               │
│  Browser → Laravel (Blade + Alpine.js) → Database           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                         NEW                                  │
│  Browser → Next.js (React) → Laravel API → Database         │
│            ↓                                                 │
│         Vercel/AWS                                           │
└─────────────────────────────────────────────────────────────┘
```

**Route Structure Clarity:**
- `routes/api.php` → Mobile app only (keep as-is)
- `routes/tenant.php` → Currently web, will become API for Next.js
- `routes/web.php` → Central site + Nova (keep as-is, or separate migration later)

---

## Phase 1: Project Setup & Infrastructure (Week 1)

### 1.1 Initialize Next.js Project
```bash
# Create new Next.js app with TypeScript
npx create-next-app@latest empowerhub-web --typescript --tailwind --app --src-dir

# Key dependencies
npm install @tanstack/react-query zustand pusher-js
npm install @radix-ui/react-* lucide-react clsx tailwind-merge
npm install next-auth @auth/core axios date-fns recharts
npm install react-hook-form @hookform/resolvers zod
```

**Directory Structure:**
```
empowerhub-web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth routes (login, etc.)
│   │   ├── (tenant)/          # Tenant app routes
│   │   │   ├── dashboard/
│   │   │   ├── appointments/
│   │   │   ├── clients/
│   │   │   ├── team/
│   │   │   ├── reports/
│   │   │   ├── schedule/
│   │   │   ├── chat/
│   │   │   └── settings/
│   │   ├── portal/            # Client & Case Manager portals
│   │   └── api/               # API routes (auth callbacks, etc.)
│   ├── components/
│   │   ├── ui/                # Base UI components
│   │   ├── forms/             # Form components
│   │   ├── layouts/           # Layout components
│   │   └── features/          # Feature-specific components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities, API client, etc.
│   ├── stores/                # Zustand state stores
│   └── types/                 # TypeScript types
├── public/
└── next.config.js
```

### 1.2 API Client Setup
**File:** `src/lib/api/client.ts`

```typescript
// Axios instance with tenant domain handling
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add tenant domain to all requests
api.interceptors.request.use((config) => {
  const domain = getTenantDomain(); // From subdomain or stored
  config.headers['X-Tenant-Domain'] = domain;
  return config;
});
```

### 1.3 Authentication Setup
**Strategy:** Laravel Sanctum token-based auth

```typescript
// src/lib/auth/index.ts
export async function login(domain: string, email: string, password: string) {
  const response = await api.post('/api/v1/login', {
    domain,
    username: email,
    password,
    device_type: 'web',
  });

  // Store token in httpOnly cookie via API route
  return response.data;
}
```

**New Laravel Endpoint Needed:**
```php
// Add to routes/api.php or routes/tenant.php
Route::post('/web/login', [WebAuthController::class, 'login']);
Route::post('/web/logout', [WebAuthController::class, 'logout']);
Route::get('/web/user', [WebAuthController::class, 'user']);
```

---

## Phase 2: Core Layout & Navigation (Week 1-2)

### 2.1 Tenant Layout
**File:** `src/app/(tenant)/layout.tsx`

Components to build:
- `Sidebar` - Navigation with role-based menu items
- `Header` - Search, notifications, user menu
- `NotificationBell` - Real-time notifications via Pusher

### 2.2 Role-Based Navigation
```typescript
const menuItems = {
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/appointments', label: 'Appointments', icon: Calendar },
    { href: '/clients', label: 'Clients', icon: Users },
    { href: '/team', label: 'Team', icon: UserCog },
    { href: '/reports', label: 'Reports', icon: BarChart },
    { href: '/schedule', label: 'Schedule', icon: CalendarDays },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  staff: [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/appointments', label: 'My Appointments', icon: Calendar },
    { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  ],
};
```

---

## Phase 3: Dashboard Migration (Week 2)

### 3.1 Dashboard Page
**File:** `src/app/(tenant)/dashboard/page.tsx`

**API Endpoint Needed:**
```php
// routes/tenant.php - New web tenant API
Route::get('/web-tenant-api/dashboard', [WebDashboardController::class, 'index']);
```

**Response Format:**
```json
{
  "stats": {
    "activeClients": 150,
    "availableCoaches": 42,
    "todayAppointments": 28,
    "weeklyUnits": 1240
  },
  "appointments": {
    "current": [...],
    "upcoming": [...],
    "completed": [...]
  },
  "alerts": {
    "pendingRequests": 5,
    "nemtToday": 3
  }
}
```

**Components:**
- `StatsCards` - Key metrics display
- `AppointmentsList` - Current/upcoming appointments
- `QuickActions` - Common actions

---

## Phase 4: Appointments Module (Week 2-4)

### 4.1 Appointments List
**File:** `src/app/(tenant)/appointments/page.tsx`

Features:
- Server-side pagination
- Filters (status, date, coach, client)
- Search
- Quick actions (cancel, reassign)

### 4.2 Appointment Calendar
**File:** `src/app/(tenant)/appointments/calendar/page.tsx`

**Options:**
1. **FullCalendar React** - Feature-rich, handles drag-drop
2. **Custom implementation** - More control, lighter

**Real-time Updates:**
```typescript
// src/hooks/useAppointmentChannel.ts
export function useAppointmentChannel() {
  useEffect(() => {
    const channel = pusher.subscribe('appointments');

    channel.bind('AppointmentStatusChanged', (data) => {
      queryClient.invalidateQueries(['appointments']);
    });

    return () => pusher.unsubscribe('appointments');
  }, []);
}
```

### 4.3 Appointment Create Form
**File:** `src/components/features/appointments/AppointmentForm.tsx`

Multi-step wizard using React Hook Form:
1. Select Client
2. Select Coach & Service
3. Date, Time, Location
4. Goals (if enabled)
5. Review & Create

### 4.4 Appointment Details
**File:** `src/app/(tenant)/appointments/[id]/page.tsx`

---

## Phase 5: Clients Module (Week 4-5)

### 5.1 Clients List
- Server components for initial data
- Client-side filtering/search
- Infinite scroll or pagination

### 5.2 Client Profile
**File:** `src/app/(tenant)/clients/[id]/page.tsx`

Tabs:
- Overview
- Appointments
- Units & Billing
- Documents
- Goals (if enabled)

---

## Phase 6: Team Module (Week 5-6)

### 6.1 Team List
### 6.2 Team Member Profile
### 6.3 Team Warnings (HR System)

---

## Phase 7: Reports Module (Week 6-7)

### 7.1 Reports Dashboard
Charts using Recharts:
- Payroll summary
- Client billing
- Unit utilization

### 7.2 Payroll Report
### 7.3 Client Billing Report
### 7.4 Team Reports (DSHS)

---

## Phase 8: Schedule Builder (Week 7-8)

Most complex component - week view with drag-drop:

**File:** `src/components/features/schedule/ScheduleBuilder.tsx`

Features:
- Week navigation
- Draft appointments
- Drag-drop placement
- Conflict detection
- Publish workflow

---

## Phase 9: Chat System (Week 8-9)

### 9.1 Chat List
### 9.2 Chat Room
Real-time messaging with Pusher

### 9.3 Video Calls
WebRTC integration for audio/video calls

---

## Phase 10: Settings & Portals (Week 9-10)

### 10.1 Application Settings
### 10.2 Branding Settings
### 10.3 Billing (Stripe)
### 10.4 Client Portal
### 10.5 Case Manager Portal

---

## Laravel Backend Changes Required

### New Web Tenant API Routes
**File:** `routes/tenant.php`

```php
// Web Tenant API routes for Next.js frontend
Route::prefix('web-tenant-api')->middleware(['auth:sanctum', 'tenant'])->group(function () {

    // Dashboard
    Route::get('/dashboard', [WebDashboardController::class, 'index']);

    // Appointments
    Route::apiResource('appointments', WebAppointmentController::class);
    Route::get('/appointments/calendar', [WebAppointmentController::class, 'calendar']);
    Route::post('/appointments/{id}/start', [WebAppointmentController::class, 'start']);
    Route::post('/appointments/{id}/complete', [WebAppointmentController::class, 'complete']);

    // Clients
    Route::apiResource('clients', WebClientController::class);
    Route::get('/clients/{id}/units', [WebClientController::class, 'units']);

    // Team
    Route::apiResource('team', WebTeamController::class);
    Route::get('/team/{id}/schedule', [WebTeamController::class, 'schedule']);

    // Reports
    Route::get('/reports/dashboard', [WebReportController::class, 'dashboard']);
    Route::get('/reports/payroll', [WebReportController::class, 'payroll']);
    Route::get('/reports/billing', [WebReportController::class, 'billing']);

    // Schedule
    Route::get('/schedule', [WebScheduleController::class, 'index']);
    Route::post('/schedule/publish', [WebScheduleController::class, 'publish']);

    // Chat
    Route::apiResource('chat/rooms', WebChatController::class);
    Route::post('/chat/rooms/{id}/messages', [WebChatController::class, 'sendMessage']);

    // Settings
    Route::get('/settings', [WebSettingsController::class, 'index']);
    Route::put('/settings', [WebSettingsController::class, 'update']);
});
```

### Response Standardization
Create consistent API responses:

```php
// app/Http/Resources/ApiResponse.php
trait ApiResponse
{
    protected function success($data, $message = null, $meta = null)
    {
        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => $message,
            'meta' => $meta,
        ]);
    }

    protected function error($message, $code = 400, $errors = null)
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $code);
    }
}
```

### CORS Updates
**File:** `config/cors.php`

Add Next.js domains:
```php
'allowed_origins' => [
    'http://localhost:3000',           // Next.js dev
    'https://app.empowerhub.io',       // Production
    'https://*.empowerhub.io',         // Tenant subdomains
],
```

---

## Deployment Strategy

### AWS Amplify (Selected)
- Stays within existing AWS infrastructure
- CI/CD pipeline with GitHub integration
- Custom domain handling for tenant subdomains
- Environment variable management
- CloudFront CDN for static assets

**Amplify Setup:**
```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Environment Variables
```env
NEXT_PUBLIC_API_URL=https://api.empowerhub.io
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=mt1
NEXT_PUBLIC_RADAR_KEY=your_radar_key
```

---

## Migration Strategy

### Approach: Parallel Operation with Gradual Cutover

1. **Week 1-10**: Build Next.js app in parallel
2. **Week 11**: Internal testing with Next.js
3. **Week 12**: Beta with select tenants
4. **Week 13-14**: Full rollout with Blade fallback
5. **Week 15+**: Remove Blade templates

### Feature Flags
```typescript
// Control rollout per tenant
const useNewUI = tenant.settings.next_js_enabled;
```

---

## Technology Stack Summary

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand + React Query |
| Forms | React Hook Form + Zod |
| UI Components | Radix UI + custom |
| Charts | Recharts |
| Maps | Leaflet / Mapbox GL |
| Real-time | Pusher.js |
| Auth | Laravel Sanctum |
| API | Axios |

---

## Files to Create (Next.js)

### Core Files
| File | Purpose |
|------|---------|
| `src/lib/api/client.ts` | Axios API client with tenant handling |
| `src/lib/auth/index.ts` | Authentication utilities |
| `src/lib/pusher.ts` | Pusher client initialization |
| `src/stores/auth.ts` | Auth state (Zustand) |
| `src/stores/ui.ts` | UI state (sidebar, theme) |

### Layout Files
| File | Purpose |
|------|---------|
| `src/app/(tenant)/layout.tsx` | Main tenant layout |
| `src/components/layouts/Sidebar.tsx` | Navigation sidebar |
| `src/components/layouts/Header.tsx` | Top header bar |

### Feature Files (per module)
| Module | Key Files |
|--------|-----------|
| Dashboard | `page.tsx`, `StatsCards.tsx`, `AppointmentsList.tsx` |
| Appointments | `page.tsx`, `[id]/page.tsx`, `calendar/page.tsx`, `AppointmentForm.tsx` |
| Clients | `page.tsx`, `[id]/page.tsx`, `ClientForm.tsx` |
| Team | `page.tsx`, `[id]/page.tsx`, `TeamForm.tsx` |
| Reports | `page.tsx`, `payroll/page.tsx`, `billing/page.tsx` |
| Schedule | `page.tsx`, `ScheduleBuilder.tsx` |
| Chat | `page.tsx`, `[roomId]/page.tsx`, `ChatRoom.tsx` |
| Settings | `page.tsx`, various setting pages |

---

## Laravel Files to Modify/Create

### New Controllers
| File | Purpose |
|------|---------|
| `app/Http/Controllers/Web/WebDashboardController.php` | Dashboard API |
| `app/Http/Controllers/Web/WebAppointmentController.php` | Appointments API |
| `app/Http/Controllers/Web/WebClientController.php` | Clients API |
| `app/Http/Controllers/Web/WebTeamController.php` | Team API |
| `app/Http/Controllers/Web/WebReportController.php` | Reports API |
| `app/Http/Controllers/Web/WebScheduleController.php` | Schedule API |
| `app/Http/Controllers/Web/WebChatController.php` | Chat API |
| `app/Http/Controllers/Web/WebSettingsController.php` | Settings API |
| `app/Http/Controllers/Web/WebAuthController.php` | Web auth flow |

### Modified Files
| File | Change |
|------|--------|
| `routes/tenant.php` | Add web-tenant-api route group |
| `config/cors.php` | Add Next.js domains |
| `config/sanctum.php` | Configure for SPA |

---

## Estimated Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Setup & Infrastructure | 1 week | Project scaffold, auth, API client |
| 2. Layout & Navigation | 1 week | Shell with sidebar, header, routing |
| 3. Dashboard | 1 week | Functional dashboard page |
| 4. Appointments | 2 weeks | List, calendar, CRUD, real-time |
| 5. Clients | 1 week | List, profile, CRUD |
| 6. Team | 1 week | List, profile, warnings |
| 7. Reports | 1 week | Dashboard, payroll, billing |
| 8. Schedule | 1 week | Week view, drag-drop, publish |
| 9. Chat | 1 week | Messaging, video calls |
| 10. Settings & Portals | 1 week | Settings, client/CM portals |
| 11-12. Testing & Polish | 2 weeks | Bug fixes, optimization |
| **Total** | **14 weeks** | Production-ready Next.js app |

---

## Success Criteria

- [ ] All tenant features accessible in Next.js
- [ ] Performance: <1s initial load, <100ms interactions
- [ ] Real-time features working (appointments, chat)
- [ ] Mobile-responsive design
- [ ] HIPAA compliance maintained
- [ ] Zero data loss during migration
- [ ] Tenant isolation preserved

