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

    // Get members
    const members = await db.membersOnGroups.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: { joinedAt: 'asc' }
    })

    const formattedMembers = members.map(member => ({
      id: member.user.id,
      username: member.user.username,
      joinedAt: member.joinedAt
    }))

    return NextResponse.json(formattedMembers)
  } catch (error) {
    console.error('Members fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}