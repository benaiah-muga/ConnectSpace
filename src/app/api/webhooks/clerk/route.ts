import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { headers } from 'next/headers'
import { Webhook } from 'svix'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  try {
    const headerPayload = headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new NextResponse('Error occurred -- no svix headers', {
        status: 400
      })
    }

    const payload = await req.json()
    const body = JSON.stringify(payload)

    const wh = new Webhook(webhookSecret || '')

    let evt: any

    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as any
    } catch (err: any) {
      console.error('Error verifying webhook:', err)
      return new NextResponse('Error occurred', {
        status: 400
      })
    }

    const eventType = evt.type

    if (eventType === 'user.created') {
      const { id, email_addresses, username, first_name, last_name } = evt.data
      
      const primaryEmail = email_addresses.find((email: any) => email.id === evt.data.primary_email_address_id)
      
      await db.user.create({
        data: {
          id,
          username: username || `${first_name}${last_name}`.toLowerCase() || primaryEmail.email_address.split('@')[0],
          email: primaryEmail.email_address,
        }
      })
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}