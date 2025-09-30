'use client'

import { useState, useEffect } from 'react'
import { useUser, SignInButton, SignOutButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, Plus, Users, Lock, MessageSquare, Mail } from 'lucide-react'

interface Group {
  id: string
  name: string
  description?: string
  isPrivate: boolean
  ownerId: string
  createdAt: string
  memberCount?: number
  isMember?: boolean
}

export default function LobbyPage() {
  const { user, isLoaded } = useUser()
  const [groups, setGroups] = useState<Group[]>([])
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [joinPassword, setJoinPassword] = useState<{ [key: string]: string }>({})

  // Check authentication
  useEffect(() => {
    if (isLoaded && !user) {
      window.location.href = '/'
      return
    }
  }, [user, isLoaded])

  // Fetch groups and sync user
  useEffect(() => {
    if (user) {
      syncUser()
      fetchGroups()
    }
  }, [user])

  const syncUser = async () => {
    try {
      await fetch('/api/temp/users/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: user?.emailAddresses?.[0]?.emailAddress,
          username: user?.username,
          firstName: user?.firstName,
          lastName: user?.lastName
        })
      })
    } catch (err) {
      console.error('Failed to sync user:', err)
    }
  }

  const fetchGroups = async () => {
    try {
      // Use temporary storage API for demo
      const response = await fetch('/api/temp/groups')
      if (!response.ok) throw new Error('Failed to fetch groups')
      
      const data = await response.json()
      setGroups(data.publicGroups || [])
      setMyGroups(data.myGroups || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const groupData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      isPrivate: formData.get('isPrivate') === 'on',
      password: formData.get('password') as string
    }

    try {
      // Use temporary storage API for demo
      const response = await fetch('/api/temp/groups', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(groupData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create group')
      }

      setShowCreateGroup(false)
      fetchGroups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group')
    }
  }

  const handleJoinGroup = async (groupId: string, requiresPassword = false) => {
    try {
      // Use temporary storage API for demo
      const response = await fetch(`/api/temp/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          password: requiresPassword ? joinPassword[groupId] : undefined 
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to join group')
      }

      fetchGroups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group')
    }
  }

  const handleLeaveGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/leave`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to leave group')
      }

      fetchGroups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave group')
    }
  }

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user?.firstName || user?.username || 'User'}!</h1>
              <p className="text-slate-600 mt-1">Connect with communities and start chatting</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Group</DialogTitle>
                    <DialogDescription>
                      Start a new conversation space for your community
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-name">Group Name</Label>
                      <Input
                        id="group-name"
                        name="name"
                        placeholder="Enter group name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="group-description">Description</Label>
                      <Textarea
                        id="group-description"
                        name="description"
                        placeholder="What's this group about?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="group-private">
                        <input
                          id="group-private"
                          name="isPrivate"
                          type="checkbox"
                          className="mr-2"
                        />
                        Private Group
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="group-password">Password (optional)</Label>
                      <Input
                        id="group-password"
                        name="password"
                        type="password"
                        placeholder="Password for private group"
                      />
                    </div>
                    <Button type="submit" className="w-full">Create Group</Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/messages'}
                className="flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Messages
              </Button>
              <SignOutButton>
                <Button variant="outline">
                  Sign Out
                </Button>
              </SignOutButton>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Groups */}
        <Tabs defaultValue="my-groups" className="w-full">
          <TabsList>
            <TabsTrigger value="my-groups">My Groups</TabsTrigger>
            <TabsTrigger value="public-groups">Public Groups</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-groups">
            {isLoading ? (
              <div className="text-center py-8">Loading your groups...</div>
            ) : myGroups.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No groups yet</h3>
                  <p className="text-slate-500 mb-4">Join or create your first group to start chatting</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myGroups.map((group) => (
                  <Card key={group.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          {group.description && (
                            <CardDescription className="mt-1">{group.description}</CardDescription>
                          )}
                        </div>
                        {group.isPrivate && <Lock className="w-4 h-4 text-slate-400" />}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {group.memberCount || 0} members
                        </Badge>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => window.location.href = `/group/${group.id}`}
                          >
                            Enter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLeaveGroup(group.id)}
                          >
                            Leave
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="public-groups">
            {isLoading ? (
              <div className="text-center py-8">Loading public groups...</div>
            ) : filteredGroups.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No groups found</h3>
                  <p className="text-slate-500">Try adjusting your search or create a new group</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredGroups.map((group) => (
                  <Card key={group.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          {group.description && (
                            <CardDescription className="mt-1">{group.description}</CardDescription>
                          )}
                        </div>
                        {group.isPrivate && <Lock className="w-4 h-4 text-slate-400" />}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {group.memberCount || 0} members
                        </Badge>
                        {group.isMember ? (
                          <Button
                            size="sm"
                            onClick={() => window.location.href = `/group/${group.id}`}
                          >
                            Enter
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            {group.isPrivate && (
                              <Input
                                size="sm"
                                type="password"
                                placeholder="Password"
                                value={joinPassword[group.id] || ''}
                                onChange={(e) => setJoinPassword(prev => ({
                                  ...prev,
                                  [group.id]: e.target.value
                                }))}
                                className="w-24"
                              />
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleJoinGroup(group.id, group.isPrivate)}
                            >
                              Join
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}