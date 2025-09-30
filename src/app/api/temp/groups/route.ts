import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { tempStorage } from '@/lib/temp-storage'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's groups
    const userGroups = await tempStorage.getUserGroups(userId)
    const formattedUserGroups = await Promise.all(
      userGroups.map(async (group) => ({
        ...group,
        memberCount: await tempStorage.getGroupMemberCount(group.id),
        isMember: true
      }))
    )

    // Get public groups
    const allGroups = await tempStorage.getAllGroups()
    const publicGroups = allGroups.filter(group => !group.isPrivate)
    const formattedPublicGroups = await Promise.all(
      publicGroups.map(async (group) => {
        const isMember = await tempStorage.isGroupMember(group.id, userId)
        return {
          ...group,
          memberCount: await tempStorage.getGroupMemberCount(group.id),
          isMember
        }
      })
    )

    return NextResponse.json({
      myGroups: formattedUserGroups,
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

    // Create group with temporary ID
    const groupId = Math.random().toString(36).substr(2, 9)
    const group = await tempStorage.createGroup({
      id: groupId,
      name,
      description,
      isPrivate: isPrivate || false,
      password: isPrivate ? password : undefined,
      ownerId: userId
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