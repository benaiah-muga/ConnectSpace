import { Server, Socket } from 'socket.io';
import { db } from './db';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('Client connected:', socket.id);
    
    // Handle authentication
    socket.on('authenticate', async (data: { token: string }) => {
      try {
        // In a real app, you'd verify JWT token here
        // For now, we'll use the user data from localStorage
        const user = JSON.parse(data.token);
        socket.userId = user.id;
        socket.username = user.username;
        
        console.log(`User ${user.username} authenticated`);
        
        // Join user to their groups and personal room
        const userGroups = await db.membersOnGroups.findMany({
          where: { userId: user.id },
          select: { groupId: true }
        });
        
        userGroups.forEach(group => {
          socket.join(group.groupId);
        });
        
        // Join user to their personal room for direct messages
        socket.join(`user:${user.id}`);
        
        socket.emit('authenticated', { success: true });
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('authentication_error', { error: 'Invalid token' });
      }
    });
    
    // Handle joining a group room
    socket.on('join_group', async (groupId: string) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      
      try {
        // Verify user is a member of the group
        const membership = await db.membersOnGroups.findUnique({
          where: {
            userId_groupId: {
              userId: socket.userId,
              groupId: groupId
            }
          }
        });
        
        if (!membership) {
          socket.emit('error', { message: 'Not a member of this group' });
          return;
        }
        
        socket.join(groupId);
        console.log(`User ${socket.username} joined group ${groupId}`);
        
        // Notify other members
        socket.to(groupId).emit('user_joined', {
          userId: socket.userId,
          username: socket.username,
          groupId
        });
        
        socket.emit('joined_group', { groupId });
      } catch (error) {
        console.error('Join group error:', error);
        socket.emit('error', { message: 'Failed to join group' });
      }
    });
    
    // Handle leaving a group room
    socket.on('leave_group', (groupId: string) => {
      socket.leave(groupId);
      console.log(`User ${socket.username} left group ${groupId}`);
      
      // Notify other members
      socket.to(groupId).emit('user_left', {
        userId: socket.userId,
        username: socket.username,
        groupId
      });
    });
    
    // Handle sending messages
    socket.on('send_message', async (data: { groupId: string; content: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      
      try {
        // Verify user is a member of the group
        const membership = await db.membersOnGroups.findUnique({
          where: {
            userId_groupId: {
              userId: socket.userId,
              groupId: data.groupId
            }
          }
        });
        
        if (!membership) {
          socket.emit('error', { message: 'Not a member of this group' });
          return;
        }
        
        // Create message in database
        const message = await db.message.create({
          data: {
            content: data.content.trim(),
            userId: socket.userId,
            groupId: data.groupId
          },
          include: {
            user: {
              select: { username: true }
            }
          }
        });
        
        // Broadcast message to all members of the group
        io.to(data.groupId).emit('new_message', {
          id: message.id,
          content: message.content,
          timestamp: message.timestamp,
          userId: message.userId,
          user: message.user
        });
        
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle sending direct messages
    socket.on('send_direct_message', async (data: { conversationId: string; content: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      
      try {
        // Verify user is part of this conversation
        const conversation = await db.conversation.findUnique({
          where: { id: data.conversationId }
        });
        
        if (!conversation || (conversation.user1Id !== socket.userId && conversation.user2Id !== socket.userId)) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }
        
        // Determine receiver
        const receiverId = conversation.user1Id === socket.userId ? conversation.user2Id : conversation.user1Id;
        
        // Create message in database
        const message = await db.directMessage.create({
          data: {
            content: data.content.trim(),
            senderId: socket.userId,
            receiverId,
            conversationId: data.conversationId
          },
          include: {
            sender: {
              select: { username: true }
            }
          }
        });
        
        // Update conversation's last message time
        await db.conversation.update({
          where: { id: data.conversationId },
          data: { lastMessageAt: new Date() }
        });
        
        // Send message to both users in their personal rooms
        const messageData = {
          id: message.id,
          content: message.content,
          timestamp: message.timestamp,
          senderId: message.senderId,
          receiverId: message.receiverId,
          conversationId: message.conversationId,
          sender: message.sender
        };
        
        // Send to sender
        io.to(`user:${socket.userId}`).emit('new_direct_message', messageData);
        
        // Send to receiver
        io.to(`user:${receiverId}`).emit('new_direct_message', messageData);
        
        console.log(`Direct message sent from ${socket.username} to user ${receiverId}`);
        
      } catch (error) {
        console.error('Send direct message error:', error);
        socket.emit('error', { message: 'Failed to send direct message' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};