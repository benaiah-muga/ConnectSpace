// Temporary in-memory storage for demo purposes
// This will reset on server restart but provides persistence during a session

interface TempUser {
  id: string
  username: string
  email: string
  createdAt: string
}

interface TempGroup {
  id: string
  name: string
  description?: string
  isPrivate: boolean
  password?: string
  ownerId: string
  createdAt: string
  members: string[]
}

interface TempMessage {
  id: string
  content: string
  userId: string
  groupId?: string
  conversationId?: string
  timestamp: string
}

interface TempConversation {
  id: string
  user1Id: string
  user2Id: string
  createdAt: string
  lastMessageAt: string
}

class TempStorage {
  private users: Map<string, TempUser> = new Map()
  private groups: Map<string, TempGroup> = new Map()
  private messages: Map<string, TempMessage[]> = new Map()
  private conversations: Map<string, TempConversation> = new Map()
  private groupMessages: Map<string, TempMessage[]> = new Map()
  private conversationMessages: Map<string, TempMessage[]> = new Map()

  // User operations
  async createUser(userData: Omit<TempUser, 'createdAt'>): Promise<TempUser> {
    const user: TempUser = {
      ...userData,
      createdAt: new Date().toISOString()
    }
    this.users.set(userData.id, user)
    return user
  }

  async getUser(id: string): Promise<TempUser | null> {
    return this.users.get(id) || null
  }

  async getUserByEmail(email: string): Promise<TempUser | null> {
    for (const user of this.users.values()) {
      if (user.email === email) return user
    }
    return null
  }

  async getAllUsers(): Promise<TempUser[]> {
    return Array.from(this.users.values())
  }

  // Group operations
  async createGroup(groupData: Omit<TempGroup, 'createdAt' | 'members'>): Promise<TempGroup> {
    const group: TempGroup = {
      ...groupData,
      createdAt: new Date().toISOString(),
      members: [groupData.ownerId]
    }
    this.groups.set(group.id, group)
    return group
  }

  async getGroup(id: string): Promise<TempGroup | null> {
    return this.groups.get(id) || null
  }

  async getAllGroups(): Promise<TempGroup[]> {
    return Array.from(this.groups.values())
  }

  async getUserGroups(userId: string): Promise<TempGroup[]> {
    return Array.from(this.groups.values()).filter(group => 
      group.members.includes(userId)
    )
  }

  async joinGroup(groupId: string, userId: string): Promise<boolean> {
    const group = this.groups.get(groupId)
    if (!group) return false
    
    if (!group.members.includes(userId)) {
      group.members.push(userId)
      return true
    }
    return false
  }

  async leaveGroup(groupId: string, userId: string): Promise<boolean> {
    const group = this.groups.get(groupId)
    if (!group) return false
    
    const index = group.members.indexOf(userId)
    if (index > -1) {
      group.members.splice(index, 1)
      return true
    }
    return false
  }

  // Message operations
  async createMessage(messageData: Omit<TempMessage, 'id' | 'timestamp'>): Promise<TempMessage> {
    const message: TempMessage = {
      ...messageData,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    }

    if (message.groupId) {
      if (!this.groupMessages.has(message.groupId)) {
        this.groupMessages.set(message.groupId, [])
      }
      this.groupMessages.get(message.groupId)!.push(message)
    } else if (message.conversationId) {
      if (!this.conversationMessages.has(message.conversationId)) {
        this.conversationMessages.set(message.conversationId, [])
      }
      this.conversationMessages.get(message.conversationId)!.push(message)
    }

    return message
  }

  async getGroupMessages(groupId: string): Promise<TempMessage[]> {
    return this.groupMessages.get(groupId) || []
  }

  async getConversationMessages(conversationId: string): Promise<TempMessage[]> {
    return this.conversationMessages.get(conversationId) || []
  }

  // Conversation operations
  async createConversation(conversationData: Omit<TempConversation, 'id' | 'createdAt' | 'lastMessageAt'>): Promise<TempConversation> {
    const conversation: TempConversation = {
      ...conversationData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString()
    }
    this.conversations.set(conversation.id, conversation)
    return conversation
  }

  async getConversation(id: string): Promise<TempConversation | null> {
    return this.conversations.get(id) || null
  }

  async getUserConversations(userId: string): Promise<TempConversation[]> {
    return Array.from(this.conversations.values()).filter(conv => 
      conv.user1Id === userId || conv.user2Id === userId
    )
  }

  async findConversation(user1Id: string, user2Id: string): Promise<TempConversation | null> {
    for (const conv of this.conversations.values()) {
      if ((conv.user1Id === user1Id && conv.user2Id === user2Id) ||
          (conv.user1Id === user2Id && conv.user2Id === user1Id)) {
        return conv
      }
    }
    return null
  }

  // Utility methods
  async getGroupMemberCount(groupId: string): Promise<number> {
    const group = this.groups.get(groupId)
    return group ? group.members.length : 0
  }

  async isGroupMember(groupId: string, userId: string): Promise<boolean> {
    const group = this.groups.get(groupId)
    return group ? group.members.includes(userId) : false
  }
}

export const tempStorage = new TempStorage()