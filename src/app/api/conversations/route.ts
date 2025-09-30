import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all conversations for the user
    const conversations = await db.conversation.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true
          }
        },
        user2: {
          select: {
            id: true,
            username: true
          }
        },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                username: true
              }
            }
          }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    })

    // Format conversations to show the other user's info
    const formattedConversations = conversations.map(conv => {
      const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1
      const lastMessage = conv.messages[0]
      
      return {
        id: conv.id,
        otherUser,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          timestamp: lastMessage.timestamp,
          senderUsername: lastMessage.sender.username
        } : null,
        messageCount: conv._count.messages,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt
      }
    })

    return NextResponse.json(formattedConversations)
  } catch (error) {
    console.error('Conversations fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { otherUserId } = await request.json()

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'Other user ID is required' },
        { status: 400 }
      )
    }

    if (otherUserId === userId) {
      return NextResponse.json(
        { error: 'Cannot start conversation with yourself' },
        { status: 400 }
      )
    }

    // Check if conversation already exists
    const existingConversation = await db.conversation.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: otherUserId },
          { user1Id: otherUserId, user2Id: userId }
        ]
      },
      include: {
        user1: {
          select: { id: true, username: true }
        },
        user2: {
          select: { id: true, username: true }
        }
      }
    })

    if (existingConversation) {
      const otherUser = existingConversation.user1Id === userId 
        ? existingConversation.user2 
        : existingConversation.user1
      
      return NextResponse.json({
        ...existingConversation,
        otherUser
      })
    }

    // Create new conversation
    const conversation = await db.conversation.create({
      data: {
        user1Id: userId,
        user2Id: otherUserId
      },
      include: {
        user1: {
          select: { id: true, username: true }
        },
        user2: {
          select: { id: true, username: true }
        }
      }
    })

    const otherUser = conversation.user2

    return NextResponse.json({
      ...conversation,
      otherUser
    }, { status: 201 })
  } catch (error) {
    console.error('Conversation creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}