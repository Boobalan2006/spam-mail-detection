"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function ApiStatusIndicator() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [lastChecked, setLastChecked] = useState<Date>(new Date())
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        // Dynamically import to avoid SSR issues
        const apiModule = await import("@/lib/api")
        const isHealthy = await apiModule.checkApiHealth()
        setStatus(isHealthy ? 'online' : 'offline')
        
        // If we're offline, we'll retry more frequently
        if (!isHealthy && retryCount < 5) {
          setRetryCount(prev => prev + 1)
        } else if (isHealthy) {
          setRetryCount(0)
        }
      } catch (err) {
        console.error("API health check error:", err)
        setStatus('offline')
        if (retryCount < 5) {
          setRetryCount(prev => prev + 1)
        }
      }
      setLastChecked(new Date())
    }

    // Check immediately on mount
    checkApiHealth()

    // Set up interval for checking - more frequent if we're still trying to connect
    const interval = setInterval(
      checkApiHealth, 
      retryCount < 5 ? 5000 : 30000 // Check every 5 seconds initially, then every 30 seconds
    )

    return () => clearInterval(interval)
  }, [retryCount])

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={
              status === 'checking' ? 'bg-gray-50 text-gray-700' :
              status === 'online' ? 'bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800' :
              'bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800'
            }
          >
            API Status: {status === 'checking' ? 'Checking...' : status === 'online' ? 'Online' : 'Offline'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Last checked: {lastChecked.toLocaleTimeString()}</p>
          {status === 'offline' && (
            <>
              <p className="text-xs mt-1">Run <code>npm run backend</code> to start the API server</p>
              <p className="text-xs mt-1">Checking again in {retryCount < 5 ? '5 seconds' : '30 seconds'}</p>
            </>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}