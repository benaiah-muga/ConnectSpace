'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Send, 
  Search, 
  MessageSquare, 
  UserPlus,
  Menu,
  X,
  Users
} from 'lucide-react'

interface User {
  id: string
  username: string
  email: string
  createdAt: string
}

interface DirectMessage {
  id: string
  content: string
  timestamp: string
  senderId: string
  sender: {
    username: string
  }
}

interface Conversation {
  id: string
  otherUser: User
  lastMessage: {
    content: string
    timestamp: string
    senderUsername: string
  } | null
  messageCount: number
  lastMessageAt: string
  createdAt: string
}

export default function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationId = searchParams.get('conversation')
  
  const [user, setUser] = useState<User | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [showConversations, setShowConversations] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
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

  // Fetch conversations
  useEffect(() => {
    if (user) {
      fetchConversations()
    }
  }, [user])

  // Handle conversation from URL params
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationId)
      if (conv) {
        selectConversation(conv)
      }
    }
  }, [conversationId, conversations])

  // Connect WebSocket
  useEffect(() => {
    if (user) {
      connectWebSocket()
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [user])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
          console.log('Authenticated for direct messaging')
        })
        
        socket.on('new_direct_message', (message) => {
          // Add message if it belongs to current conversation
          if (currentConversation && message.conversationId === currentConversation.id) {
            setMessages(prev => [...prev, message])
          }
          
          // Update conversation list to show new message
          fetchConversations()
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

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: { 'x-user-id': user?.id }
      })
      
      if (!response.ok) throw new Error('Failed to fetch conversations')
      
      const data = await response.json()
      setConversations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
    } finally {
      setIsLoading(false)
    }
  }

  const selectConversation = async (conversation: Conversation) => {
    setCurrentConversation(conversation)
    setShowConversations(false)
    
    // Update URL
    const url = new URL(window.location.href)
    url.searchParams.set('conversation', conversation.id)
    window.history.pushState({}, '', url.toString())
    
    // Fetch messages
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        headers: { 'x-user-id': user?.id }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/users?search=${encodeURIComponent(query)}`, {
        headers: { 'x-user-id': user?.id }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data)
      }
    } catch (err) {
      console.error('Failed to search users:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const startConversation = async (otherUser: User) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id
        },
        body: JSON.stringify({ otherUserId: otherUser.id })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start conversation')
      }

      const newConversation = await response.json()
      setConversations(prev => [newConversation, ...prev])
      selectConversation(newConversation)
      setShowNewChat(false)
      setUserSearch('')
      setSearchResults([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversation')
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending || !currentConversation) return

    setIsSending(true)
    const messageContent = newMessage.trim()
    setNewMessage('')

    try {
      // Send via Socket.IO for real-time delivery
      if (socketRef.current) {
        socketRef.current.emit('send_direct_message', {
          conversationId: currentConversation.id,
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

  if (!user) {
    return <div>Loading...</div>
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
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold text-slate-900">Messages</h1>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value)
                        searchUsers(e.target.value)
                      }}
                      className="pl-10"
                    />
                  </div>
                  {isSearching && (
                    <div className="text-center text-slate-500">Searching...</div>
                  )}
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {searchResults.map((searchUser) => (
                        <div
                          key={searchUser.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer"
                          onClick={() => startConversation(searchUser)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">
                                {searchUser.username.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-900">{searchUser.username}</p>
                              <p className="text-sm text-slate-500">{searchUser.email}</p>
                            </div>
                          </div>
                          <Button size="sm">Chat</Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConversations(!showConversations)}
              className="lg:hidden"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Conversations Sidebar */}
        <aside className={`${showConversations ? 'block' : 'hidden'} lg:block w-80 bg-white border-r border-slate-200`}>
          <div className="p-4">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Conversations
            </h2>
            {isLoading ? (
              <div className="text-center py-8">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No conversations yet</p>
                <p className="text-sm text-slate-500">Start a new chat to begin messaging</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-8rem)]">
                <div className="space-y-2">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        currentConversation?.id === conversation.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-slate-50'
                      }`}
                      onClick={() => selectConversation(conversation)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="text-sm">
                            {conversation.otherUser.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-slate-900 truncate">
                              {conversation.otherUser.username}
                            </p>
                            {conversation.lastMessage && (
                              <span className="text-xs text-slate-500">
                                {new Date(conversation.lastMessage.timestamp).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {conversation.lastMessage ? (
                            <p className="text-sm text-slate-600 truncate">
                              {conversation.lastMessage.senderUsername}: {conversation.lastMessage.content}
                            </p>
                          ) : (
                            <p className="text-sm text-slate-500">No messages yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col bg-white">
          {currentConversation ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {currentConversation.otherUser.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-slate-900">
                      {currentConversation.otherUser.username}
                    </p>
                    <p className="text-xs text-slate-500">Active now</p>
                  </div>
                </div>
              </div>

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
                          message.senderId === user?.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.senderId !== user?.id && (
                          <Avatar className="w-8 h-8 mt-1">
                            <AvatarFallback className="text-xs">
                              {message.sender.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-xs sm:max-w-md lg:max-w-lg ${
                            message.senderId === user?.id ? 'order-first' : ''
                          }`}
                        >
                          {message.senderId !== user?.id && (
                            <p className="text-xs text-slate-500 mb-1">
                              {message.sender.username}
                            </p>
                          )}
                          <div
                            className={`rounded-lg px-3 py-2 ${
                              message.senderId === user?.id
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
                        {message.senderId === user?.id && (
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Select a conversation</h3>
                <p className="text-slate-500">Choose a conversation from the sidebar or start a new chat</p>
              </div>
            </div>
          )}
        </main>

        {/* Mobile Conversations Overlay */}
        {showConversations && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
            <div className="bg-white w-80 h-full overflow-y-auto">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Conversations
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConversations(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentConversation?.id === conversation.id
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-slate-50'
                    }`}
                    onClick={() => {
                      selectConversation(conversation)
                      setShowConversations(false)
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="text-sm">
                          {conversation.otherUser.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-900 truncate">
                            {conversation.otherUser.username}
                          </p>
                          {conversation.lastMessage && (
                            <span className="text-xs text-slate-500">
                              {new Date(conversation.lastMessage.timestamp).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {conversation.lastMessage ? (
                          <p className="text-sm text-slate-600 truncate">
                            {conversation.lastMessage.senderUsername}: {conversation.lastMessage.content}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-500">No messages yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <Alert className="m-4 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}