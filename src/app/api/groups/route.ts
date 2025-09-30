import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's groups
    const userGroups = await db.membersOnGroups.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            _count: {
              select: { members: true }
            }
          }
        }
      }
    })

    // Get public groups
    const publicGroups = await db.group.findMany({
      where: { isPrivate: false },
      include: {
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Format response
    const myGroups = userGroups.map(mg => ({
      ...mg.group,
      memberCount: mg.group._count.members,
      isMember: true
    }))

    const formattedPublicGroups = publicGroups.map(group => {
      const isMember = userGroups.some(ug => ug.groupId === group.id)
      return {
        ...group,
        memberCount: group._count.members,
        isMember
      }
    })

    return NextResponse.json({
      myGroups,
      publicGroups: formattedPublicGroups
    })
  } catch (error) {
    console.error('Groups fetch error:', error)
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

    const { name, description, isPrivate, password } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      )
    }

    // Create group
    const group = await db.group.create({
      data: {
        name,
        description,
        isPrivate: isPrivate || false,
        password: isPrivate ? password : null,
        ownerId: userId
      },
      include: {
        _count: {
          select: { members: true }
        }
      }
    })

    // Add owner as member
    await db.membersOnGroups.create({
      data: {
        userId,
        groupId: group.id
      }
    })

    return NextResponse.json({
      ...group,
      memberCount: 1,
      isMember: true
    }, { status: 201 })
  } catch (error) {
    console.error('Group creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}