import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { groupId } = await params

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
        { error: 'Not a member of this group' },
        { status: 404 }
      )
    }

    // Check if user is the owner
    const group = await db.group.findUnique({
      where: { id: groupId }
    })

    if (group?.ownerId === userId) {
      return NextResponse.json(
        { error: 'Group owner cannot leave. Transfer ownership first.' },
        { status: 400 }
      )
    }

    // Remove user from group
    await db.membersOnGroups.delete({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Leave group error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}