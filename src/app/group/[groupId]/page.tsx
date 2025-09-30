'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  Send, 
  Users, 
  MessageSquare, 
  LogOut,
  Menu,
  X
} from 'lucide-react'

interface User {
  id: string
  username: string
  email: string
}

interface Message {
  id: string
  content: string
  timestamp: string
  userId: string
  user: {
    username: string
  }
}

interface GroupMember {
  id: string
  username: string
  joinedAt: string
}

interface Group {
  id: string
  name: string
  description?: string
  isPrivate: boolean
  ownerId: string
}

export default function GroupChatPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.groupId as string
  
  const [user, setUser] = useState<User | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<any>(null)

  // Check authentication
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/')
      return
    }
    setUser(JSON.parse(userData))
  }, [router])

  // Fetch initial data
  useEffect(() => {
    if (user && groupId) {
      fetchGroupData()
      connectWebSocket()
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [user, groupId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchGroupData = async () => {
    try {
      // Fetch group info
      const groupResponse = await fetch(`/api/groups/${groupId}`, {
        headers: { 'x-user-id': user?.id }
      })
      
      if (!groupResponse.ok) {
        if (groupResponse.status === 404) {
          setError('Group not found')
        } else if (groupResponse.status === 403) {
          setError('You are not a member of this group')
        }
        return
      }
      
      const groupData = await groupResponse.json()
      setGroup(groupData.group)

      // Fetch messages
      const messagesResponse = await fetch(`/api/groups/${groupId}/messages`)
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json()
        setMessages(messagesData)
      }

      // Fetch members
      const membersResponse = await fetch(`/api/groups/${groupId}/members`)
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        setMembers(membersData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load group data')
    } finally {
      setIsLoading(false)
    }
  }

  const connectWebSocket = () => {
    try {
      // Import socket.io-client dynamically
      import('socket.io-client').then(({ io }) => {
        const socket = io('http://localhost:3000')
        
        socket.on('connect', () => {
          console.log('Connected to chat server')
          
          // Authenticate with user data
          socket.emit('authenticate', { token: JSON.stringify(user) })
        })
        
        socket.on('authenticated', () => {
          // Join the group room
          socket.emit('join_group', groupId)
        })
        
        socket.on('new_message', (message) => {
          setMessages(prev => [...prev, message])
        })
        
        socket.on('user_joined', (data) => {
          setMembers(prev => [...prev, {
            id: data.userId,
            username: data.username,
            joinedAt: new Date().toISOString()
          }])
        })
        
        socket.on('user_left', (data) => {
          setMembers(prev => prev.filter(m => m.id !== data.userId))
        })
        
        socket.on('error', (error) => {
          console.error('Socket error:', error)
          setError(error.message)
        })
        
        socket.on('disconnect', () => {
          console.log('Disconnected from chat server')
        })
        
        socketRef.current = socket
      })
    } catch (error) {
      console.error('Failed to connect Socket.IO:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    const messageContent = newMessage.trim()
    setNewMessage('')

    try {
      // Send via Socket.IO for real-time delivery
      if (socketRef.current) {
        socketRef.current.emit('send_message', {
          groupId,
          content: messageContent
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setNewMessage(messageContent) // Restore message on error
    } finally {
      setIsSending(false)
    }
  }

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return

    try {
      const response = await fetch(`/api/groups/${groupId}/leave`, {
        method: 'POST',
        headers: { 'x-user-id': user?.id }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to leave group')
      }

      router.push('/lobby')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave group')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading chat room...</p>
        </div>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error || 'Group not found'}
              </AlertDescription>
            </Alert>
            <Button onClick={() => router.push('/lobby')}>
              Back to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/lobby')}
              className="lg:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{group.name}</h1>
              {group.description && (
                <p className="text-sm text-slate-600">{group.description}</p>
              )}
            </div>
            {group.isPrivate && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Private
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMembers(!showMembers)}
              className="hidden sm:flex"
            >
              <Users className="w-4 h-4 mr-2" />
              {members.length}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeaveGroup}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Members Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 bg-white border-r border-slate-200">
          <div className="p-4">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members ({members.length})
            </h2>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {member.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {member.username}
                      </p>
                      <p className="text-xs text-slate-500">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col bg-white">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.userId === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.userId !== user?.id && (
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarFallback className="text-xs">
                          {message.user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-xs sm:max-w-md lg:max-w-lg ${
                        message.userId === user?.id ? 'order-first' : ''
                      }`}
                    >
                      {message.userId !== user?.id && (
                        <p className="text-xs text-slate-500 mb-1">
                          {message.user.username}
                        </p>
                      )}
                      <div
                        className={`rounded-lg px-3 py-2 ${
                          message.userId === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <p className="text-sm break-words">{message.content}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {message.userId === user?.id && (
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarFallback className="text-xs">
                          {user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t border-slate-200 p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2 max-w-3xl mx-auto">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={isSending}
                className="flex-1"
              />
              <Button type="submit" disabled={isSending || !newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </main>

        {/* Mobile Members Sidebar */}
        {showMembers && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
            <div className="bg-white w-80 h-full overflow-y-auto">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Members ({members.length})
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMembers(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {member.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {member.username}
                      </p>
                      <p className="text-xs text-slate-500">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}