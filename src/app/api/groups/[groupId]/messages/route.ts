import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const groupId = params.groupId

    // Check if user is a member
    const membership = await db.membersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get messages
    const messages = await db.message.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            username: true
          }
        }
      },
      orderBy: { timestamp: 'asc' }
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Messages fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
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
    const groupId = params.groupId

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Check if user is a member
    const membership = await db.membersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Create message
    const message = await db.message.create({
      data: {
        content: content.trim(),
        userId,
        groupId
      },
      include: {
        user: {
          select: {
            username: true
          }
        }
      }
    })

    // TODO: Broadcast to WebSocket clients
    // This will be handled by the WebSocket server

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Message creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}