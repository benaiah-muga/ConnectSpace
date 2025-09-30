import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { tempStorage } from '@/lib/temp-storage'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already exists
    const existingUser = await tempStorage.getUser(userId)
    if (existingUser) {
      return NextResponse.json(existingUser)
    }

    // Get user data from Clerk
    const user = await request.json()
    const { email, username, firstName, lastName } = user

    // Create user in temporary storage
    const newUser = await tempStorage.createUser({
      id: userId,
      username: username || `${firstName}${lastName}`.toLowerCase() || email.split('@')[0],
      email
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('User sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}