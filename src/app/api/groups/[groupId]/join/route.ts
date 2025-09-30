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

    const { password } = await request.json()
    const { groupId } = await params

    // Check if group exists
    const group = await db.group.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMember = await db.membersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'Already a member of this group' },
        { status: 409 }
      )
    }

    // Check password for private groups
    if (group.isPrivate && group.password !== password) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Add user to group
    await db.membersOnGroups.create({
      data: {
        userId,
        groupId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Join group error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}