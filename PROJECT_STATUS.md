# Chat Application Backend

This is a **real-time chat application backend** built with **NestJS**, **Prisma**, and **Socket.IO**, supporting multiple devices per user, typing indicators, and media messages.

---

## Features Implemented (Backend)

### 1. User Authentication & Device Validation

* Users authenticate using **JWT**.
* Each session has a **device ID**.
* Backend validates devices to prevent unauthorized access.

### 2. Chat Rooms

* **Create Chat Room** (group & one-on-one chats).
* **Join Chat Room** (adds user to chat participants, sends full chat history).
* **Leave Chat Room** (users leave chat, system message emitted).

### 3. Messaging

* **Send Text Message** (stored in DB, broadcast to participants).
* **Send Media Message** (supports images/videos/documents, media URL saved).
* **Message History** (fetch all messages in a chat with sender info).

### 4. User Typing Indicator

* `typing_start` & `typing_stop` events.
* Auto-stop after 5s of inactivity.
* **Multiple Devices per User**: typing on one device is reflected on all other devices.

### 5. Real-Time Features (WebSocket / Socket.IO)

* Handles join/leave, messages, typing, system messages.
* Server emits to all devices of participants except the sender's device.

### 6. Chats Management

* Fetch all chats for a user with pagination and search.
* Returns last message, participants, and metadata.

### 7. Media Download Tracking

* Users can download media.
* Downloads tracked in `mediaDownload` table.

---

## Backend Structure

```
src/
│
├─ chat/
│   ├─ chat.gateway.ts     # WebSocket events (messages, typing, join/leave)
│   ├─ chat.service.ts     # Business logic (DB, device validation, typing)
│   ├─ chat.controller.ts  # REST API endpoints
│
├─ prisma/
│   └─ Prisma.service.ts   # Prisma client
│
├─ auth/
│   └─ jwt-auth.guard.ts   # JWT authentication
│
└─ types/
    └─ jwt-user.ts         # Type definitions for JWT user
```

---

## Tech Stack

* **Backend:** NestJS, Node.js
* **Database:** PostgreSQL / MySQL (via Prisma)
* **WebSocket:** Socket.IO
* **File Storage:** Local uploads (future cloud storage support)
* **Authentication:** JWT with device tracking

---

## Diagrams

### 1. Message Flow

```text
User A Device 1   ---> [Server] --->   User B Device 1
          \                       \
           \---> User A Device 2    ---> User B Device 2
```

* Messages broadcast to **all devices** of participants.
* Sender's other devices are excluded.

### 2. Typing Indicator Flow

```text
User A Device 1 (typing)
        |
        v
[Server] ---> User B Device 1 (shows typing)
        |
        ---> User B Device 2 (shows typing)
        |
        ---> User A Device 2 (excluded)
```

* Auto-stop after 5s of inactivity.
* Reflected across all other devices.

### 3. Multi-Device Management

```text
UserSockets Map
---------------------------
userId: "A" => [socket1, socket2]
userId: "B" => [socket3, socket4]

Server logic:
- Emit events to all sockets of participants
- Exclude socket emitting the event itself
```

---

## Future / Planned Features


  
  
* Push notifications for offline users.
* Cloud storage for media files.
* Advanced search and filtering of messages.

---

This README captures **all backend features implemented so far**, with diagrams illustrating **multi-device messaging, typing indicators, and message flow** like modern chat applications.
