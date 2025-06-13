"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Loader2, Mail, User as UserIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface UserProfileDialogProps {
  triggerButton?: React.ReactNode;
}

export function UserProfileDialog({ triggerButton }: UserProfileDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [stats, setStats] = useState({
    totalScans: 0,
    spamDetected: 0,
    lastScan: "Never"
  })

  // Load user data when dialog opens
  useEffect(() => {
    if (open) {
      const loadUserData = async () => {
        try {
          setLoading(true)
          
          // Get user data from localStorage
          const storedUserData = localStorage.getItem("user_data")
          let userId: string | null = null;
          let possibleKeys: string[] = ["demo"];
          if (storedUserData) {
            const parsedUserData = JSON.parse(storedUserData)
            setUserData(parsedUserData)
            if (parsedUserData.email) possibleKeys.push(String(parsedUserData.email));
            if (parsedUserData.id) possibleKeys.push(String(parsedUserData.id));
          }

          // Try to load scan stats from bulk_reports or scan_history using the first key with data
          let scans: any[] = [];
          let foundKey = null;
          const bulkReports = localStorage.getItem('bulk_reports');
          if (bulkReports) {
            try {
              const reports = JSON.parse(bulkReports);
              for (const key of possibleKeys) {
                if (reports[key] && Array.isArray(reports[key]) && reports[key].length > 0) {
                  scans = reports[key];
                  foundKey = key;
                  break;
                }
              }
            } catch (e) { /* ignore */ }
          }

          // If not found, try scan_history
          if (scans.length === 0) {
            const scanHistory = localStorage.getItem('scan_history');
            if (scanHistory) {
              try {
                const history = JSON.parse(scanHistory);
                for (const key of possibleKeys) {
                  if (history[key] && Array.isArray(history[key]) && history[key].length > 0) {
                    scans = history[key];
                    foundKey = key;
                    break;
                  }
                }
              } catch (e) { /* ignore */ }
            }
          }

          // Calculate stats
          let totalScans = scans.length;
          let spamDetected = scans.filter((scan: any) => scan.prediction === "spam").length;
          let lastScan = "Never";
          if (totalScans > 0 && scans[0] && typeof scans[0].timestamp === 'string') {
            lastScan = new Date(scans[0].timestamp).toLocaleDateString();
          }

          setStats({
            totalScans,
            spamDetected,
            lastScan
          });
        } catch (error) {
          console.error("Error loading user data:", error)
          toast.error("Failed to load profile data")
        } finally {
          setLoading(false)
        }
      }
      
      loadUserData()
    }
  }, [open])

  const handleLogout = () => {
    // Clear auth data from localStorage
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")
    
    setOpen(false)
    toast.info("You have been logged out")
    
    // Force page reload to reset state
    window.location.reload()
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="ghost">Profile</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>
            View and manage your account information
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : userData ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-3">
              <Avatar className="h-20 w-20">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${userData.username}`} alt={userData.username} />
                <AvatarFallback>{getInitials(userData.username)}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-xl font-semibold">{userData.username}</h3>
                <p className="text-sm text-muted-foreground flex items-center justify-center">
                  <Mail className="mr-1 h-3 w-3" />
                  {userData.email}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{stats.totalScans}</p>
                <p className="text-xs text-muted-foreground">Total Scans</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.spamDetected}</p>
                <p className="text-xs text-muted-foreground">Spam Detected</p>
              </div>
              <div>
                <p className="text-sm font-medium">{stats.lastScan}</p>
                <p className="text-xs text-muted-foreground">Last Scan</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p>Failed to load user data</p>
            <Button variant="outline" className="mt-4" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}