"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export function DebugVisualizations() {
  const [batchId, setBatchId] = useState('')
  const [visualizations, setVisualizations] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchVisualizations = async () => {
    if (!batchId) {
      toast.error("Please enter a batch ID")
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        toast.error("You need to be logged in")
        return
      }
      
      // Fetch visualizations
      const response = await fetch(`http://localhost:5001/report/${batchId}/visualizations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch visualizations: ${response.status}`)
      }
      
      const data = await response.json()
      console.log("Visualization data:", data)
      setVisualizations(data.visualizations)
      toast.success("Visualizations loaded successfully")
    } catch (err) {
      console.error("Error fetching visualizations:", err)
      setError(err.message)
      toast.error("Failed to load visualizations")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Debug Visualizations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter batch ID"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
          />
          <Button onClick={fetchVisualizations} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load Visualizations"}
          </Button>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 text-red-800 rounded-md">
            Error: {error}
          </div>
        )}
        
        {visualizations && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium mb-4">Spam vs Ham Distribution</h3>
              <div className="flex justify-center">
                <img 
                  src={`data:image/png;base64,${visualizations.pie_chart}`} 
                  alt="Spam vs Ham Distribution" 
                  className="max-w-full h-auto"
                />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Confidence Distribution</h3>
              <div className="flex justify-center">
                <img 
                  src={`data:image/png;base64,${visualizations.confidence_histogram}`} 
                  alt="Confidence Distribution" 
                  className="max-w-full h-auto"
                />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Top Influential Words</h3>
              <div className="flex justify-center">
                <img 
                  src={`data:image/png;base64,${visualizations.word_influence}`} 
                  alt="Word Influence" 
                  className="max-w-full h-auto"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}