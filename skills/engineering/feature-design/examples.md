# Feature Design Example: Interactive Notification Center

This document provides a reference example of a feature design following the structure defined in `SKILL.md`.

## 1. Goal
Design an in-app Notification Center that allows users to receive, read, and filter real-time notifications about their account activities.

---

## User Flow

1. **Receiving Notification**: A user performs an action (e.g., likes a post) -> the system sends a notification -> a badge count updates on the bell icon in real-time.
2. **Viewing Notifications**: User clicks the bell icon -> a dropdown panel opens displaying a list of recent notifications (unread first).
3. **Filtering**: User selects "Unread" filter -> only unread notifications are displayed.
4. **Marking as Read**: User clicks a notification item or clicks "Mark all as read" -> the badge count decreases.
5. **Action Redirection**: User clicks a notification -> they are redirected to the corresponding resource (e.g., the post).

---

## Component Tree

```
Layout (Header)
└── NotificationBell (Badge count, trigger dropdown)
    └── NotificationDropdown (Dropdown panel)
        ├── DropdownHeader (Title, "Mark all as read" button)
        ├── FilterTabs (All, Unread)
        ├── NotificationList (Scrollable list container)
        │   ├── NotificationItem (Avatar, content, timestamp, unread indicator, action button)
        │   └── EmptyState (Visible when no notifications match filter)
        └── DropdownFooter ("View all notifications" link)
```

---

## State Architecture

### State Store Shape
```typescript
interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  targetUrl: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  filter: 'all' | 'unread';
  isOpen: boolean;
  isLoading: boolean;
}
```

### Key Actions
- `FETCH_NOTIFICATIONS_START` / `SUCCESS` / `FAILURE`
- `TOGGLE_DROPDOWN`
- `MARK_AS_READ(id)`
- `MARK_ALL_AS_READ`
- `RECEIVE_REALTIME_NOTIFICATION`

---

## API Contract

### 1. Get Notifications
- **Endpoint**: `GET /api/notifications`
- **Query Params**: `limit=20`, `page=1`, `unreadOnly=true|false`
- **Response**:
  ```json
  {
    "data": [
      {
        "id": "notif_123",
        "title": "New Comment",
        "body": "John Doe commented on your design.",
        "isRead": false,
        "createdAt": "2026-06-05T15:00:00Z",
        "targetUrl": "/designs/design_456"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20
    }
  }
  ```

### 2. Mark Notification as Read
- **Endpoint**: `PATCH /api/notifications/:id/read`
- **Response**: `200 OK` with updated status.

---

## Risks

1. **Performance at Scale**: Frequent polling or high websocket traffic could degrade performance.
   * *Mitigation*: Implement debouncing, pagination, and restrict local polling intervals to 30 seconds if websockets fail.
2. **Stale Badge Counts**: Badge counts going out of sync across multiple browser tabs.
   * *Mitigation*: Share status across tabs using `BroadcastChannel` or sync badge count on window focus.

---

## Implementation Plan

1. **Milestone 1**: Database schema updates & backend REST API endpoints.
2. **Milestone 2**: Websocket integration for real-time notification push.
3. **Milestone 3**: UI components (Bell, Dropdown, Items) using static mock data.
4. **Milestone 4**: Integration of state management and API client hooks.
5. **Milestone 5**: Polish transitions, animations, and edge-case testing.
