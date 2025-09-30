import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { conversationId } = await params

    // Check if user is part of this conversation
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId }
    })

    if (!conversation || (conversation.user1Id !== userId && conversation.user2Id !== userId)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get messages
    const messages = await db.directMessage.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            username: true
          }
        }
      },
      orderBy: { timestamp: 'asc' }
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Direct messages fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { content } = await request.json()
    const { conversationId } = await params

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Check if user is part of this conversation
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId }
    })

    if (!conversation || (conversation.user1Id !== userId && conversation.user2Id !== userId)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Determine receiver
    const receiverId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id

    // Create message
    const message = await db.directMessage.create({
      data: {
        content: content.trim(),
        senderId: userId,
        receiverId,
        conversationId
      },
      include: {
        sender: {
          select: {
            username: true
          }
        }
      }
    })

    // Update conversation's last message time
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    })

    // TODO: Broadcast to WebSocket clients
    // This will be handled by the WebSocket server

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Direct message creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}