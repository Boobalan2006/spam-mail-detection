"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, FileText, Download, BarChart, PieChart, AlertCircle, Loader2, ServerCrash, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { isAuthenticated } from "@/lib/api"
import { SimplifiedAuth } from "./simplified-auth"

export function BulkAnalysisPanel() {
  const [file, setFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [activeTab, setActiveTab] = useState("summary")
  const [visualizations, setVisualizations] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [serverStatus, setServerStatus] = useState("unknown")
  const [currentBatchId, setCurrentBatchId] = useState(null)
  const [visualizationRetries, setVisualizationRetries] = useState(0)
  const [isLoadingVisualizations, setIsLoadingVisualizations] = useState(false)
  const fileInputRef = useRef(null)
  const retryTimeoutRef = useRef(null)
  const maxRetries = 3
  const retryDelay = 2000

  // Server endpoints to try
  const SERVER_ENDPOINTS = ['http://localhost:5000', 'http://127.0.0.1:5000'];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  // Auto-retry visualizations when tab is active
  useEffect(() => {
    if (activeTab === "visualizations" && currentBatchId && !visualizations && !isLoadingVisualizations) {
      refreshVisualizations()
    }
  }, [activeTab, currentBatchId, visualizations, isLoadingVisualizations])

  // Check server status periodically
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    let currentEndpointIndex = 0;
    let retryCount = 0;

    const checkServerStatus = async () => {
      if (!isMounted) return;

      try {
        const endpoint = SERVER_ENDPOINTS[currentEndpointIndex];
        console.log(`Trying to connect to ${endpoint}...`);

        const response = await fetch(`${endpoint}/health`, { 
          signal: AbortSignal.timeout(3000), // 3 second timeout
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          mode: 'cors'
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        if (data.status === 'healthy') {
          console.log(`Successfully connected to ${endpoint}`);
          setServerStatus("online");
          retryCount = 0;
          // Store the working endpoint
          window.localStorage.setItem('apiEndpoint', endpoint);
        } else {
          throw new Error("Invalid server response");
        }
      } catch (error) {
        if (!isMounted) return;
        
        console.error("Server check failed:", error);
        
        // Try the next endpoint
        currentEndpointIndex = (currentEndpointIndex + 1) % SERVER_ENDPOINTS.length;
        
        // If we've tried all endpoints, increment retry count
        if (currentEndpointIndex === 0) {
          retryCount++;
        }

        const newStatus = "offline";
        setServerStatus(prev => {
          if (prev === "online" && newStatus === "offline") {
            toast.error("Lost connection to server", {
              description: retryCount > 0 
                ? `Attempting to reconnect... (Attempt ${retryCount}/${maxRetries})` 
                : "Trying alternative endpoints..."
            });
          }
          return newStatus;
        });

        // If we haven't exceeded max retries, try again after a delay
        if (retryCount < maxRetries) {
          const delay = 2000 * Math.pow(2, retryCount - 1); // Exponential backoff
          setTimeout(checkServerStatus, delay);
        } else {
          toast.error("Server connection failed", {
            description: "Please ensure the backend server is running and try again."
          });
        }
      }
    };

    // Initial check
    checkServerStatus();
    
    // Set up periodic checks with longer interval
    const interval = setInterval(checkServerStatus, 30000); // Check every 30 seconds

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, []); // Empty dependency array means this effect runs once on mount

  // Helper function to get the current API endpoint
  const getApiEndpoint = () => {
    return window.localStorage.getItem('apiEndpoint') || SERVER_ENDPOINTS[0];
  };

  // Update all fetch calls to use the current endpoint
  const makeApiRequest = async (path, options = {}) => {
    const endpoint = getApiEndpoint();
    console.log(`Making API request to ${endpoint}${path}`);

    try {
      // For file uploads, we need to handle the headers differently
      const isFileUpload = options.body instanceof FormData;
      const headers = isFileUpload 
        ? {} // No headers needed for file upload
        : {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          };

      const response = await fetch(`${endpoint}${path}`, {
        ...options,
        headers,
        mode: 'cors',
        credentials: 'include',
        signal: AbortSignal.timeout(30000) // 30 second timeout for file uploads
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `API request failed: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error(`API request failed to ${endpoint}${path}:`, error);
      // If this endpoint failed, try the next one
      const currentIndex = SERVER_ENDPOINTS.indexOf(endpoint);
      const nextEndpoint = SERVER_ENDPOINTS[(currentIndex + 1) % SERVER_ENDPOINTS.length];
      window.localStorage.setItem('apiEndpoint', nextEndpoint);
      throw error;
    }
  };

  const processDroppedFile = async (droppedFile) => {
    // Reset states
    setVisualizations(null)
    setReportData(null)
    setDebugInfo(null)
    setVisualizationRetries(0)

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024
    if (droppedFile.size > maxSize) {
      toast.error("File too large", {
        description: "Please upload a file smaller than 10MB"
      })
      return
    }

    // Validate file type
    if (!droppedFile.name.toLowerCase().match(/\.(txt|csv)$/)) {
      toast.error("Invalid file type", {
        description: "Please upload a .txt or .csv file"
      })
      return
    }

    try {
      const content = await droppedFile.text()
      const lines = content.split('\n').filter(line => line.trim())
      
      if (lines.length === 0) {
        throw new Error("The file appears to be empty")
      }

      if (lines.length > 1000) {
        toast.warning("Large file detected", {
          description: "Processing may take longer for files with more than 1000 entries"
        })
      }

      // For CSV files, validate format
      if (droppedFile.name.toLowerCase().endsWith('.csv')) {
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
        const messageCol = headers.findIndex(h => ['message', 'text', 'content', 'email'].includes(h))
        
        if (messageCol === -1) {
          throw new Error("CSV must have a 'message' or 'text' column")
        }
      }

      setFile(droppedFile)
      toast.success("File loaded successfully", {
        description: `Found ${lines.length} emails to analyze`
      })

    } catch (error) {
      toast.error("Failed to process file", {
        description: error.message || "Please check the file format and try again"
      })
      setFile(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files?.length > 0) {
      processDroppedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files?.length > 0) {
      processDroppedFile(e.target.files[0])
    }
  }

  const loadVisualizations = async (batchId, isFirstTry = true) => {
    if (visualizationRetries >= maxRetries) {
      toast.error("Failed to load visualizations", {
        description: "Maximum retry attempts reached. Please try refreshing manually."
      })
      return null
    }

    if (serverStatus === "offline") {
      toast.error("Cannot load visualizations", {
        description: "Server is offline. Please wait for reconnection."
      })
      return null
    }

    setIsLoadingVisualizations(true)

    try {
      // First verify the server is actually responding
      const healthCheck = await fetch('http://localhost:5000/', { 
        signal: AbortSignal.timeout(2000),
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!healthCheck.ok) {
        throw new Error("Server is not responding")
      }

      // Then try to fetch visualizations
      const response = await fetch(`http://localhost:5000/report/${batchId}/visualizations`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      const data = await response.json()
      
      // Check if we have all expected visualizations
      const hasAllVisualizations = data.visualizations && 
        data.visualizations.pie_chart &&
        data.visualizations.confidence_histogram &&
        data.visualizations.word_influence

      if (!data.visualizations || !hasAllVisualizations) {
        // Only show loading toast on first try
        if (isFirstTry) {
          toast.info("Generating visualizations...", {
            description: "This may take a moment"
          })
        }
        
        setVisualizationRetries(prev => prev + 1)
        
        // Schedule next retry with exponential backoff
        const backoffDelay = retryDelay * Math.pow(1.5, visualizationRetries)
        retryTimeoutRef.current = setTimeout(() => {
          loadVisualizations(batchId, false)
        }, backoffDelay)

        return null
      }

      setVisualizationRetries(0)
      setVisualizations(data.visualizations)
      return data.visualizations

    } catch (error) {
      console.error("Visualization error:", error)
      
      if (error.name === 'TimeoutError' || error.message.includes('Failed to fetch')) {
        setServerStatus("offline")
        toast.error("Server connection lost", {
          description: "Attempting to reconnect..."
        })
      } else {
        toast.error("Failed to load visualizations", {
          description: error.message
        })
      }
      
      // Schedule retry with exponential backoff
      const backoffDelay = retryDelay * Math.pow(1.5, visualizationRetries)
      retryTimeoutRef.current = setTimeout(() => {
        loadVisualizations(batchId, false)
      }, backoffDelay)
      
      return null
    } finally {
      setIsLoadingVisualizations(false)
    }
  }

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    if (serverStatus === "offline") {
      toast.error("Server unavailable", {
        description: "Please wait for the server to come back online"
      });
      return;
    }

    setIsLoading(true);
    setReportData(null);
    setVisualizations(null);
    setDebugInfo(null);
    setVisualizationRetries(0);

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        console.log(`Attempting file upload (attempt ${retryCount + 1}/${maxRetries})`);
        
        const response = await makeApiRequest('/bulk-analyze', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        
        if (!data.batch_id) {
          throw new Error("No batch ID returned");
        }

        console.log("Upload successful, batch ID:", data.batch_id);
        setCurrentBatchId(data.batch_id);
        setReportData(data.report);
        setActiveTab("summary");

        // Start loading visualizations
        loadVisualizations(data.batch_id);
        
        toast.success("File uploaded successfully", {
          description: "Analysis is in progress..."
        });
        
        break; // Success, exit retry loop
      } catch (error) {
        console.error("Upload attempt failed:", error);
        retryCount++;

        if (retryCount < maxRetries) {
          toast.error(`Upload attempt failed (${retryCount}/${maxRetries})`, {
            description: "Retrying with alternative endpoint..."
          });
          await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, retryCount - 1))); // Exponential backoff
        } else {
          toast.error("Upload failed", {
            description: error.message || "Please try again later"
          });
        }
      }
    }

    setIsLoading(false);
  };

  const handleDownload = async () => {
    if (!reportData?.batch_id) return
    
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        `http://localhost:5000/report/${reportData.batch_id}/download`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `spam_analysis_${reportData.batch_id}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success("Report downloaded successfully")
    } catch (error) {
      toast.error("Download failed", {
        description: error.message
      })
    }
  }

  const refreshVisualizations = async () => {
    if (!currentBatchId) return
    
    // Clear any pending retries
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }
    
    setVisualizationRetries(0)
    setVisualizations(null)
    
    const result = await loadVisualizations(currentBatchId)
    if (!result && serverStatus === "online") {
      toast.error("Failed to refresh visualizations", {
        description: "Please try again in a moment"
      })
    }
  }

  return (
    <Card className="h-full">
      <CardContent className="space-y-4">
        {/* Server status indicator */}
        {serverStatus === "offline" && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center">
              <ServerCrash className="h-5 w-5 text-red-500 mr-2" />
              <h3 className="font-medium text-red-700 dark:text-red-400">Server Connection Issue</h3>
            </div>
            <p className="mt-1 text-sm text-red-600 dark:text-red-300">
              Cannot connect to the backend server. File uploads will fail until the server is available.
            </p>
          </div>
        )}

        {reportData && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFile(null)
                setReportData(null)
                setVisualizations(null)
                setDebugInfo(null)
                setCurrentBatchId(null)
              }}
            >
              Clear Analysis
            </Button>
          </div>
        )}

        {!reportData ? (
          <div 
            className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${
              isDragging ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20" : "border-gray-300 dark:border-gray-700"
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              setIsDragging(false)
            }}
            onDrop={handleDrop}
          >
            <Upload className={`h-8 w-8 mx-auto mb-4 ${isDragging ? "text-indigo-500" : "text-muted-foreground"}`} />
            <p className="mb-2 text-sm font-medium">
              {isDragging ? "Drop your file here" : "Drag & drop your file here"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Supported formats: .txt (one email per line) or .csv (with message column)
            </p>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
            >
              Select File
            </Button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".txt,.csv" 
              className="hidden" 
              onChange={handleFileChange}
            />
            {file && (
              <p className="mt-4 text-sm">
                Selected file: <span className="font-medium">{file.name}</span>
              </p>
            )}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-2xl font-bold">{reportData.total_emails}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">Spam Detected</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-2xl font-bold text-red-600">{reportData.spam_count}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">Ham Detected</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-2xl font-bold text-green-600">{reportData.ham_count}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">Spam Percentage</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-2xl font-bold">
                      {((reportData.spam_count / reportData.total_emails) * 100).toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {visualizations?.pie_chart && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Distribution</h3>
                  <div className="flex justify-center">
                    <img 
                      src={`data:image/png;base64,${visualizations.pie_chart}`} 
                      alt="Spam vs Ham Distribution" 
                      className="max-w-full h-auto"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <Button onClick={handleDownload} className="flex items-center">
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-[100px]">Result</TableHead>
                      <TableHead className="w-[100px]">Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="max-w-[300px] truncate">{result.message}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              result.prediction === "spam"
                                ? "bg-red-100 text-red-800 hover:bg-red-200"
                                : "bg-green-100 text-green-800 hover:bg-green-200"
                            }
                          >
                            {result.prediction}
                          </Badge>
                        </TableCell>
                        <TableCell>{result.confidence.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="visualizations" className="mt-4 space-y-8">
              {!visualizations ? (
                <div className="text-center p-8">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                    <div>
                      <p className="text-lg font-medium mb-2">
                        {isLoadingVisualizations ? "Generating Visualizations..." : "Loading Visualizations..."}
                      </p>
                      {visualizationRetries > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Attempt {visualizationRetries} of {maxRetries}
                        </p>
                      )}
                    </div>
                    {visualizationRetries > 0 && (
                      <Button 
                        variant="outline" 
                        onClick={refreshVisualizations}
                        disabled={isLoadingVisualizations}
                        className="mt-4"
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingVisualizations ? 'animate-spin' : ''}`} />
                        Retry Now
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {visualizations.pie_chart && (
                    <div>
                      <h3 className="text-lg font-medium mb-4">Distribution</h3>
                      <div className="flex justify-center">
                        <img 
                          src={`data:image/png;base64,${visualizations.pie_chart}`} 
                          alt="Spam vs Ham Distribution" 
                          className="max-w-full h-auto"
                        />
                      </div>
                    </div>
                  )}

                  {visualizations.confidence_histogram && (
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
                  )}

                  {visualizations.word_influence && (
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
                  )}

                  <div className="flex justify-center">
                    <Button 
                      variant="outline"
                      onClick={refreshVisualizations}
                      disabled={isLoadingVisualizations}
                      className="mt-4"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingVisualizations ? 'animate-spin' : ''}`} />
                      {isLoadingVisualizations ? 'Refreshing...' : 'Refresh Visualizations'}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      {!reportData && (
        <CardFooter>
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={handleSubmit}
            disabled={!file || isLoading || serverStatus === "offline"}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : serverStatus === "offline" ? (
              <>
                <ServerCrash className="mr-2 h-4 w-4" />
                Server Offline
              </>
            ) : (
              "Analyze Emails"
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}




