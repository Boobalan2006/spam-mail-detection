"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BarChart3, Bell, FileText, Home, Loader2, LogOut, Mail, Moon, Settings, Shield, Sun, User as UserIcon, Upload } from "lucide-react"
import { useTheme } from "next-themes"
import dynamic from "next/dynamic"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ApiStatusIndicator } from "@/components/api-status-indicator"
import { EmailAnalysisPanel } from "@/components/email-analysis-panel"
import { ModelInsights } from "@/components/model-insights"
import { RecentScans } from "@/components/recent-scans"
import { ResultsPanel } from "@/components/results-panel"
import { TechnologyCards } from "@/components/technology-cards"
import { SimplifiedAuth } from "@/components/simplified-auth"
import { PrivacyPolicyDialog } from "@/components/privacy-policy-dialog"
import { isAuthenticated, removeAuthToken } from "@/lib/api"
import { toast } from "sonner"

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [userStats, setUserStats] = useState({
    totalScans: 0,
    spamDetected: 0,
    lastScan: "Never"
  })
  const { theme, setTheme } = useTheme()

  // Load user data and stats
  const loadUserData = () => {
    // Check if user is authenticated
    const authenticated = isAuthenticated()
    if (authenticated) {
      // Get user data from localStorage
      const storedUserData = localStorage.getItem("user_data")
      if (storedUserData) {
        setUser(JSON.parse(storedUserData))
        
        // Get user stats from scan history
        const userId = localStorage.getItem('user_id')
        if (userId) {
          const history = JSON.parse(localStorage.getItem('scan_history') || '{}')
          if (history[userId]) {
            const scans = history[userId]
            const spamCount = scans.filter((scan: any) => scan.prediction === "spam").length
            const lastScanDate = scans.length > 0 
              ? new Date(scans[0].timestamp).toLocaleDateString() 
              : "Never"
              
            setUserStats({
              totalScans: scans.length,
              spamDetected: spamCount,
              lastScan: lastScanDate
            })
          }
        }
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUserData()
    
    // Listen for new scans to update stats
    const handleNewScan = () => {
      loadUserData()
    }
    
    window.addEventListener('emailAnalyzed', handleNewScan)
    
    return () => {
      window.removeEventListener('emailAnalyzed', handleNewScan)
    }
  }, [])

  const handleAuthSuccess = (userData: any) => {
    setUser(userData)
    setAuthDialogOpen(false)
    toast.success("Authentication successful")
    loadUserData()
  }

  const handleLogout = () => {
    removeAuthToken()
    localStorage.removeItem("user_data")
    localStorage.removeItem("user_id")
    setUser(null)
    setProfileOpen(false)
    toast.info("You have been logged out")
  }

  // Generate initials from username
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            <span className="text-xl font-bold">SpamShield AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => {
                const tab = document.querySelector('[role="tab"][value="history"]');
                if (tab) (tab as HTMLElement).click();
              }}
              className="text-sm font-medium flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={() => {
                const tab = document.querySelector('[role="tab"][value="bulk"]');
                if (tab) (tab as HTMLElement).click();
              }}
              className="text-sm font-medium flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Upload className="h-4 w-4" />
              Bulk Analysis
            </button>
            <button
              onClick={() => {
                const tab = document.querySelector('[role="tab"][value="insights"]');
                if (tab) (tab as HTMLElement).click();
              }}
              className="text-sm font-medium flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </button>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-600" />
              <span className="sr-only">Notifications</span>
            </Button>
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} 
                        alt={user.username} 
                      />
                      <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setAuthDialogOpen(true)}
              >
                Login / Register
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Spam Detection Dashboard</h1>
              <p className="text-muted-foreground">Analyze emails and detect spam with advanced ML models.</p>
            </div>
            <div className="flex items-center gap-2">
              <ApiStatusIndicator />
              <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800">
                Models: Up-to-date
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EmailAnalysisPanel />
            <ResultsPanel />
          </div>

          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid w-full md:w-auto grid-cols-4">
              <TabsTrigger value="history">Scan History</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Analysis</TabsTrigger>
              <TabsTrigger value="insights">Model Insights</TabsTrigger>
              <TabsTrigger value="technology">Technology</TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Scans</CardTitle>
                  <CardDescription>View your recent email analysis history.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentScans />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="bulk" className="mt-4">
              {(() => {
                const BulkAnalysisTab = dynamic(() => import("@/components/bulk-analysis-tab-fixed").then(mod => mod.BulkAnalysisTab), {
                  loading: () => <div className="p-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading bulk analysis...</p>
                  </div>,
                  ssr: false
                });
                return <BulkAnalysisTab />;
              })()}
            </TabsContent>
            <TabsContent value="insights" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Model Performance</CardTitle>
                  <CardDescription>Compare the performance metrics of our spam detection models.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ModelInsights />
                </CardContent>
              </Card>
              
              {/* Debug Visualizations Tool */}
              {(() => {
                const DebugVisualizations = dynamic(() => import("@/components/debug-visualizations").then(mod => mod.DebugVisualizations), {
                  loading: () => <p>Loading debug tool...</p>,
                  ssr: false
                });
                return <div className="mt-6"><DebugVisualizations /></div>;
              })()}
            </TabsContent>
            <TabsContent value="technology" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Technology Stack</CardTitle>
                  <CardDescription>Learn about the technologies powering our spam detection system.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TechnologyCards />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col md:h-16 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">© 2025 SpamShield AI. All rights reserved.</p>
          <div className="mt-4 md:mt-0 flex items-center gap-4">
            <Link href="https://github.com/Aruna168/Email-spam-detection" target="_blank" className="text-sm text-muted-foreground hover:text-foreground">
              GitHub
            </Link>
            <Link href="mailto:contact@spamshield-ai.example.com" className="text-sm text-muted-foreground hover:text-foreground">
              Contact
            </Link>
            <PrivacyPolicyDialog />
          </div>
        </div>
      </footer>

      {/* Authentication Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Authentication</DialogTitle>
            <DialogDescription>
              Login or create an account to access all features
            </DialogDescription>
          </DialogHeader>
          <SimplifiedAuth onAuthSuccess={handleAuthSuccess} />
        </DialogContent>
      </Dialog>

      {/* User Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>
              View and manage your account information
            </DialogDescription>
          </DialogHeader>
          {user && (
            <div className="space-y-6">
              <div className="flex flex-col items-center space-y-3">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} alt={user.username} />
                  <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="text-xl font-semibold">{user.username}</h3>
                  <p className="text-sm text-muted-foreground flex items-center justify-center">
                    <Mail className="mr-1 h-3 w-3" />
                    {user.email}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{userStats.totalScans}</p>
                  <p className="text-xs text-muted-foreground">Total Scans</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.spamDetected}</p>
                  <p className="text-xs text-muted-foreground">Spam Detected</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{userStats.lastScan}</p>
                  <p className="text-xs text-muted-foreground">Last Scan</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setProfileOpen(false)}>
                  Close
                </Button>
                <Button variant="destructive" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>User Settings</DialogTitle>
            <DialogDescription>
              Customize your experience with SpamShield AI
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Theme</h3>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    id="light" 
                    name="theme" 
                    value="light"
                    checked={theme === "light"}
                    onChange={() => setTheme("light")}
                  />
                  <label htmlFor="light" className="flex items-center">
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    id="dark" 
                    name="theme" 
                    value="dark"
                    checked={theme === "dark"}
                    onChange={() => setTheme("dark")}
                  />
                  <label htmlFor="dark" className="flex items-center">
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    id="system" 
                    name="theme" 
                    value="system"
                    checked={theme === "system"}
                    onChange={() => setTheme("system")}
                  />
                  <label htmlFor="system">System</label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                Close
              </Button>
              <Button type="button" onClick={() => {
                localStorage.setItem('theme_preference', theme || 'light');
                setSettingsOpen(false);
                toast.success("Settings saved");
              }}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}