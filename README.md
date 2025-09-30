# ConnectSpace - Real-time Group Chat Application

A modern, full-stack real-time group chat platform built with Next.js 15, TypeScript, Tailwind CSS, and WebSockets.

## Features

### Core Functionality
- **User Authentication**: Sign up and sign in with secure password hashing
- **Group Management**: Create, join, and leave groups with optional private/password protection
- **Real-time Messaging**: Instant message delivery using WebSockets
- **Member Management**: View group members and real-time join/leave notifications
- **Search & Discovery**: Find and join public groups

### Technical Features
- **Responsive Design**: Mobile-first design with desktop optimizations
- **Real-time Updates**: WebSocket integration for instant messaging
- **Type Safety**: Full TypeScript implementation
- **Modern UI**: Beautiful interface using shadcn/ui components
- **Database**: SQLite with Prisma ORM for type-safe database operations

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (New York style)
- **Database**: SQLite with Prisma ORM
- **Real-time**: Socket.IO for WebSocket communication
- **Authentication**: Custom implementation with bcryptjs

## Project Structure

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   └── groups/            # Group management endpoints
│   ├── group/[groupId]/       # Chat room page
│   ├── lobby/                 # Group lobby page
│   └── page.tsx               # Authentication page
├── components/ui/             # shadcn/ui components
├── lib/
│   ├── db.ts                  # Prisma database client
│   └── socket.ts              # WebSocket server setup
└── prisma/
    └── schema.prisma          # Database schema
```

## Database Schema

### User
- `id`: Unique identifier
- `username`: Unique username
- `email`: Unique email address
- `passwordHash`: Hashed password
- `createdAt/updatedAt`: Timestamps

### Group
- `id`: Unique identifier
- `name`: Group name
- `description`: Optional description
- `isPrivate`: Privacy setting
- `password`: Optional password for private groups
- `ownerId`: Group owner reference

### Message
- `id`: Unique identifier
- `content`: Message content
- `timestamp`: Send time
- `userId`: Sender reference
- `groupId`: Group reference

### MembersOnGroups (Join Table)
- `userId`: User reference
- `groupId`: Group reference
- `joinedAt`: Join timestamp

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   npm run db:push
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Create an Account**: Sign up with a username, email, and password
2. **Join/Create Groups**: Browse public groups or create your own
3. **Start Chatting**: Enter a group and start real-time conversations
4. **Manage Groups**: Leave groups, view members, and create new communities

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Authenticate user

### Groups
- `GET /api/groups` - Get user's groups and public groups
- `POST /api/groups` - Create new group
- `GET /api/groups/[groupId]` - Get group details
- `POST /api/groups/[groupId]/join` - Join a group
- `POST /api/groups/[groupId]/leave` - Leave a group
- `GET /api/groups/[groupId]/messages` - Get group messages
- `POST /api/groups/[groupId]/messages` - Send message
- `GET /api/groups/[groupId]/members` - Get group members

### WebSocket Events
- `authenticate` - Authenticate WebSocket connection
- `join_group` - Join group room
- `leave_group` - Leave group room
- `send_message` - Send message to group
- `new_message` - Receive new message
- `user_joined/user_left` - Member status updates

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run db:push` - Push schema changes to database

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Prisma for type-safe database operations
- Modern React patterns with hooks

## Features in Detail

### Authentication System
- Secure password hashing with bcryptjs
- Session management via localStorage
- Protected routes with authentication checks

### Real-time Messaging
- WebSocket integration using Socket.IO
- Instant message delivery
- Connection status indicators
- Fallback to HTTP polling when WebSocket unavailable

### Responsive Design
- Mobile-first approach
- Touch-friendly interface
- Adaptive layouts for different screen sizes
- Slide-out member panel on mobile

### Group Management
- Public and private groups
- Password-protected groups
- Group ownership and permissions
- Member management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).