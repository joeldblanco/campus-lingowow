'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  HardDrive, 
  Users, 
  FileText, 
  Image as LucideImage, 
  Video, 
  Music,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Activity,
  PieChart,
  LineChart,
  Zap
} from 'lucide-react'
import { useUsageStats } from '@/hooks/use-file-manager'
import { formatFileSize, formatNumber } from '@/lib/utils'
import { FileResourceType } from '@prisma/client'

interface UsageAnalyticsProps {
  className?: string
  refreshInterval?: number
}

interface UsageTrend {
  date: string
  uploads: number
  downloads: number
  storage: number
  bandwidth: number
}

interface TopUser {
  id: string
  name: string
  email: string
  uploads: number
  storage: number
  lastActive: string
}

export const UsageAnalytics: React.FC<UsageAnalyticsProps> = ({
  className = '',
  refreshInterval = 30000 // 30 seconds
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [topUsers, setTopUsers] = useState<TopUser[]>([])

  const { stats, loading, error, refresh } = useUsageStats()

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refresh, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, refresh])

  useEffect(() => {
    // Generate mock trend data (in real implementation, this would come from API)
    const generateMockTrends = () => {
      const trends: UsageTrend[] = []
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        
        trends.push({
          date: date.toISOString().split('T')[0],
          uploads: Math.floor(Math.random() * 50) + 10,
          downloads: Math.floor(Math.random() * 200) + 50,
          storage: Math.floor(Math.random() * 1000000) + 500000,
          bandwidth: Math.floor(Math.random() * 2000000) + 1000000
        })
      }
    }

    const generateMockTopUsers = () => {
      const users: TopUser[] = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          uploads: 145,
          storage: 2500000000,
          lastActive: '2 hours ago'
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          uploads: 98,
          storage: 1800000000,
          lastActive: '1 day ago'
        },
        {
          id: '3',
          name: 'Bob Johnson',
          email: 'bob@example.com',
          uploads: 76,
          storage: 1200000000,
          lastActive: '3 hours ago'
        }
      ]
      
      setTopUsers(users)
    }

    generateMockTrends()
    generateMockTopUsers()
  }, [timeRange])

  const getResourceTypeIcon = (type: FileResourceType) => {
    switch (type) {
      case FileResourceType.IMAGE: return <LucideImage className="h-4 w-4" />
      case FileResourceType.VIDEO: return <Video className="h-4 w-4" />
      case FileResourceType.AUDIO: return <Music className="h-4 w-4" />
      case FileResourceType.RAW: return <FileText className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getStorageUsagePercentage = () => {
    if (!stats?.cloudinaryUsage?.storage) return 0
    const planLimit = 100000000000 // 100GB example limit
    return Math.min((stats.cloudinaryUsage.storage / planLimit) * 100, 100)
  }

  const getBandwidthUsagePercentage = () => {
    if (!stats?.cloudinaryUsage) return 0
    const planLimit = 500000000000 // 500GB example limit
    return Math.min((stats.cloudinaryUsage.bandwidth / planLimit) * 100, 100)
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return <Activity className="h-4 w-4 text-gray-500" />
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">
            Analytics Error
          </h3>
          <p className="text-red-600">{error}</p>
          <Button onClick={refresh} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Usage Analytics</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Select value={timeRange} onValueChange={(value: '7d' | '30d' | '90d' | '1y') => setTimeRange(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto Refresh
              </Button>
              
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{formatNumber(stats?.totalFiles || 0)}</p>
                <p className="text-sm text-gray-600">Total Files</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              {getTrendIcon(stats?.recentUploads || 0, 0)}
              <span className="text-sm text-gray-600">
                {stats?.recentUploads || 0} new this week
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{formatFileSize(stats?.totalSize || 0)}</p>
                <p className="text-sm text-gray-600">Storage Used</p>
              </div>
            </div>
            <Progress value={getStorageUsagePercentage()} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">
              {getStorageUsagePercentage().toFixed(1)}% of plan limit
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Download className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {formatFileSize(stats?.cloudinaryUsage?.bandwidth || 0)}
                </p>
                <p className="text-sm text-gray-600">Bandwidth</p>
              </div>
            </div>
            <Progress value={getBandwidthUsagePercentage()} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">
              {getBandwidthUsagePercentage().toFixed(1)}% of plan limit
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">
                  {formatNumber((stats?.cloudinaryUsage?.transformed_images || 0) + 
                               (stats?.cloudinaryUsage?.transformed_videos || 0))}
                </p>
                <p className="text-sm text-gray-600">Transformations</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-600">Optimization active</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="types">File Types</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="users">Top Users</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LineChart className="h-5 w-5" />
                  <span>Upload Trends</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <div className="text-center text-gray-500">
                    <LineChart className="h-12 w-12 mx-auto mb-2" />
                    <p>Upload trend chart would be displayed here</p>
                    <p className="text-sm">Integration with chart library needed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Storage Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <div className="text-center text-gray-500">
                    <PieChart className="h-12 w-12 mx-auto mb-2" />
                    <p>Storage distribution chart would be displayed here</p>
                    <p className="text-sm">Integration with chart library needed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Files by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats?.byType || {})
                  .sort(([, a], [, b]) => (b as { size: number }).size - (a as { size: number }).size)
                  .map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-3">
                      {getResourceTypeIcon(type as FileResourceType)}
                      <div>
                        <p className="font-medium">{type}</p>
                        <p className="text-sm text-gray-600">
                          {(data as { count: number; size: number }).count} files • {formatFileSize((data as { count: number; size: number }).size)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {(((data as { count: number; size: number }).size / (stats?.totalSize || 1)) * 100).toFixed(1)}%
                      </p>
                      <Progress 
                        value={(((data as { count: number; size: number }).size / (stats?.totalSize || 1)) * 100)} 
                        className="w-24 mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Files by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats?.byCategory || {})
                  .sort(([, a], [, b]) => (b as { size: number }).size - (a as { size: number }).size)
                  .map(([category, data]) => (
                  <div key={category} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{category.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-600">
                        {(data as { count: number; size: number }).count} files • {formatFileSize((data as { count: number; size: number }).size)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {(((data as { count: number; size: number }).size / (stats?.totalSize || 1)) * 100).toFixed(1)}%
                      </p>
                      <Progress 
                        value={(((data as { count: number; size: number }).size / (stats?.totalSize || 1)) * 100)} 
                        className="w-24 mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Top Users by Storage</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          Last active {user.lastActive}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatFileSize(user.storage)}</p>
                      <p className="text-sm text-gray-600">{user.uploads} uploads</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cloudinary Usage Details */}
      {stats?.cloudinaryUsage && (
        <Card>
          <CardHeader>
            <CardTitle>Cloudinary Plan Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 border rounded">
                <p className="text-sm text-gray-600">Plan</p>
                <p className="font-medium">{stats.cloudinaryUsage.plan}</p>
              </div>
              <div className="p-3 border rounded">
                <p className="text-sm text-gray-600">Objects</p>
                <p className="font-medium">{formatNumber(stats.cloudinaryUsage.objects)}</p>
              </div>
              <div className="p-3 border rounded">
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="font-medium">
                  {new Date(stats.cloudinaryUsage.last_updated).toLocaleDateString()}
                </p>
              </div>
              <div className="p-3 border rounded">
                <p className="text-sm text-gray-600">Transformed Images</p>
                <p className="font-medium">{formatNumber(stats.cloudinaryUsage.transformed_images)}</p>
              </div>
              <div className="p-3 border rounded">
                <p className="text-sm text-gray-600">Transformed Videos</p>
                <p className="font-medium">{formatNumber(stats.cloudinaryUsage.transformed_videos)}</p>
              </div>
              <div className="p-3 border rounded">
                <p className="text-sm text-gray-600">Rate Limit Remaining</p>
                <p className="font-medium">{formatNumber(stats.cloudinaryUsage.rate_limit_remaining || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Storage Alert Component
interface StorageAlertProps {
  currentUsage: number
  planLimit: number
  threshold?: number
}

export const StorageAlert: React.FC<StorageAlertProps> = ({
  currentUsage,
  planLimit,
  threshold = 0.8 // 80% by default
}) => {
  const usagePercentage = (currentUsage / planLimit) * 100
  const isNearLimit = usagePercentage >= (threshold * 100)

  if (!isNearLimit) return null

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <div className="flex-1">
            <h3 className="font-medium text-orange-900">
              Storage Limit Warning
            </h3>
            <p className="text-sm text-orange-700">
              You&apos;ve used {usagePercentage.toFixed(1)}% of your storage plan. 
              Consider upgrading your plan or cleaning up old files.
            </p>
          </div>
          <Button variant="outline" size="sm">
            Upgrade Plan
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
