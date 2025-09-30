import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { tempStorage } from '@/lib/temp-storage'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { groupId } = await params
    const { password } = await request.json()

    const group = await tempStorage.getGroup(groupId)
    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Check if already a member
    const isMember = await tempStorage.isGroupMember(groupId, userId)
    if (isMember) {
      return NextResponse.json(
        { error: 'Already a member' },
        { status: 400 }
      )
    }

    // Check password for private groups
    if (group.isPrivate && group.password !== password) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Join group
    const success = await tempStorage.joinGroup(groupId, userId)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to join group' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Join group error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}