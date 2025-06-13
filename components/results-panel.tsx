"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface AnalysisResult {
  prediction: string
  confidence: number // This is now a percentage (0-100)
  word_influence: Array<{ word: string; influence: number }>
}

export function ResultsPanel() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState<string>("Enhanced Naive Bayes")
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    // Listen for the custom event from the EmailAnalysisPanel
    const handleEmailAnalyzed = (event: CustomEvent<{ result: AnalysisResult; model: string }>) => {
      setResult(event.detail.result)
      setModel(event.detail.model)
      setError(null)
      setApiStatus('online')
    }

    // Listen for API errors
    const handleApiError = (event: CustomEvent<{ message: string }>) => {
      setError(event.detail.message)
      setResult(null)
      setApiStatus('offline')
    }

    window.addEventListener("emailAnalyzed", handleEmailAnalyzed as EventListener)
    window.addEventListener("apiError", handleApiError as EventListener)

    const checkApiHealth = async () => {
      try {
        const apiModule = await import("@/lib/api")
        const isHealthy = await apiModule.checkApiHealth()
        setApiStatus(isHealthy ? 'online' : 'offline')
        
        if (!isHealthy) {
          setError("API service is currently unavailable. Please make sure the Flask server is running.")
        }
      } catch (err) {
        console.error("API health check error:", err)
        setApiStatus('offline')
        setError("Could not connect to API service. Please make sure the Flask server is running.")
      }
    }
    
    const timer = setTimeout(() => {
      checkApiHealth()
    }, 1000)

    return () => {
      window.removeEventListener("emailAnalyzed", handleEmailAnalyzed as EventListener)
      window.removeEventListener("apiError", handleApiError as EventListener)
      clearTimeout(timer)
    }
  }, [])

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Analysis Results</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Spam detection results will appear here after analysis.
          {apiStatus === 'checking' && (
            <span className="ml-1 text-yellow-600 dark:text-yellow-400">
              Checking API status...
            </span>
          )}
          {apiStatus === 'offline' && (
            <span className="ml-1 text-red-600 dark:text-red-400">
              API is currently offline.
            </span>
          )}
          {apiStatus === 'online' && (
            <span className="ml-1 text-green-600 dark:text-green-400">
              API is online and ready.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center min-h-[300px] p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            <p className="text-lg font-medium">Analyzing email content...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center space-y-4 text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div>
              <p className="text-lg font-medium mb-2">Error</p>
              <p className="text-muted-foreground text-sm">{error}</p>
              {apiStatus === 'offline' && (
                <div className="mt-6 text-sm bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                  <p className="font-medium mb-2">To start the Flask server, run:</p>
                  <pre className="bg-slate-100 dark:bg-slate-800 p-2 rounded mb-2 text-xs">
                    npm run backend
                  </pre>
                  <p className="font-medium mb-2">Or directly with Python:</p>
                  <pre className="bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs">
                    python app.py
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : !result ? (
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <Clock className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium mb-1">No Analysis Yet</p>
              <p className="text-muted-foreground text-sm">Submit an email to see results</p>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-8">
            <div className="flex flex-col items-center space-y-4">
              {result.prediction === "spam" ? (
                <AlertCircle className="h-12 w-12 text-red-500" />
              ) : (
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              )}
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">
                  {result.prediction === "spam" ? "Spam Detected" : "Ham (Not Spam)"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Model: {model}
                </p>
              </div>
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Confidence</span>
                <span className="text-sm font-medium">{result.confidence.toFixed(2)}%</span>
              </div>
              <Progress
                value={result.confidence}
                className={`h-2 ${
                  result.prediction === "spam" 
                    ? "bg-red-100 [&>[data-state=completed]]:bg-red-500" 
                    : "bg-green-100 [&>[data-state=completed]]:bg-green-500"
                }`}
              />
            </div>

            {result.word_influence && result.word_influence.length > 0 && (
              <div className="space-y-4 max-w-md mx-auto">
                <h4 className="text-sm font-medium mb-3">Top Influential Words</h4>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  {result.word_influence.slice(0, 5).map((word, index) => (
                    <div 
                      key={word.word} 
                      className={`
                        flex justify-between items-center py-2
                        ${index !== 0 ? "border-t border-slate-200 dark:border-slate-700" : ""}
                      `}
                    >
                      <span className="text-sm font-medium">{word.word}</span>
                      <span className="text-sm text-muted-foreground">
                        {word.influence.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-b-lg px-6 py-4">
        Results are based on machine learning models and may not be 100% accurate.
      </CardFooter>
    </Card>
  )
}