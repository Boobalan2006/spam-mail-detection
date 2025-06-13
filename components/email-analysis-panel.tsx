"use client"

import type React from "react"
import { useState, useRef } from "react"
import { AlertCircle, ChevronDown, FileUp, Globe, Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { makeApiRequest } from "@/lib/api"

interface WordInfluence {
  word: string;
  influence: number;
}

interface SpamKeyword {
  word: string;
  weight: number;
}

// More comprehensive spam detection model
const spamKeywords: SpamKeyword[] = [
  // Common spam words with weights
  { word: 'free', weight: 0.7 },
  { word: 'winner', weight: 0.8 },
  { word: 'congratulations', weight: 0.6 },
  { word: 'prize', weight: 0.7 },
  { word: 'money', weight: 0.5 },
  { word: 'offer', weight: 0.5 },
  { word: 'limited', weight: 0.5 },
  { word: 'urgent', weight: 0.6 },
  { word: 'viagra', weight: 0.9 },
  { word: 'click', weight: 0.5 },
  { word: 'cash', weight: 0.6 },
  { word: 'guarantee', weight: 0.5 },
  { word: 'credit', weight: 0.4 },
  { word: 'investment', weight: 0.4 },
  { word: 'million', weight: 0.7 },
  { word: 'discount', weight: 0.5 },
  { word: 'save', weight: 0.4 },
  { word: 'buy', weight: 0.3 },
  { word: 'subscribe', weight: 0.3 },
  { word: 'casino', weight: 0.8 },
  { word: 'lottery', weight: 0.8 },
  { word: 'bonus', weight: 0.6 },
  { word: 'promotion', weight: 0.5 },
  { word: 'pills', weight: 0.8 },
  { word: 'medication', weight: 0.7 },
  { word: 'pharmacy', weight: 0.7 },
  { word: 'debt', weight: 0.6 },
  { word: 'loan', weight: 0.5 },
  { word: 'bitcoin', weight: 0.6 },
  { word: 'crypto', weight: 0.6 }
];

// Phrases that strongly indicate spam
const spamPhrases = [
  "act now",
  "limited time",
  "don't miss",
  "click here",
  "risk free",
  "satisfaction guaranteed",
  "no obligation",
  "no risk",
  "100% free",
  "best price",
  "cash bonus",
  "double your",
  "earn extra",
  "extra cash",
  "free access",
  "free consultation",
  "free gift",
  "free info",
  "free offer",
  "free trial",
  "great offer",
  "increase sales",
  "lose weight",
  "no credit check",
  "no fees",
  "no hidden costs",
  "order now",
  "special promotion",
  "while supplies last",
  "winner"
];

// Words that indicate legitimate email
const hamKeywords = [
  { word: 'meeting', weight: 0.6 },
  { word: 'report', weight: 0.5 },
  { word: 'project', weight: 0.5 },
  { word: 'schedule', weight: 0.6 },
  { word: 'update', weight: 0.4 },
  { word: 'document', weight: 0.5 },
  { word: 'team', weight: 0.4 },
  { word: 'regards', weight: 0.5 },
  { word: 'sincerely', weight: 0.5 },
  { word: 'thanks', weight: 0.4 },
  { word: 'please', weight: 0.3 },
  { word: 'review', weight: 0.4 },
  { word: 'discuss', weight: 0.5 },
  { word: 'agenda', weight: 0.6 },
  { word: 'minutes', weight: 0.5 }
];

// Function to analyze email content
function analyzeEmail(content: string) {
  const lowercaseContent = content.toLowerCase();
  let spamScore = 0;
  let hamScore = 0;
  let totalWeight = 0;
  
  // Initialize arrays with proper types
  const matchedSpamWords: WordInfluence[] = [];
  const matchedHamWords: WordInfluence[] = [];
  
  // Check for spam keywords
  for (const keyword of spamKeywords) {
    const regex = new RegExp(`\\b${keyword.word}\\b`, 'gi');
    const matches = lowercaseContent.match(regex);
    if (matches) {
      const count = matches.length;
      spamScore += keyword.weight * count;
      totalWeight += keyword.weight * count;
      matchedSpamWords.push({ word: keyword.word, influence: keyword.weight * count });
    }
  }
  
  // Check for spam phrases
  for (const phrase of spamPhrases) {
    if (lowercaseContent.includes(phrase)) {
      spamScore += 0.8;
      totalWeight += 0.8;
      matchedSpamWords.push({ word: phrase, influence: 0.8 });
    }
  }
  
  // Check for ham keywords
  for (const keyword of hamKeywords) {
    const regex = new RegExp(`\\b${keyword.word}\\b`, 'gi');
    const matches = lowercaseContent.match(regex);
    if (matches) {
      const count = matches.length;
      hamScore += keyword.weight * count;
      totalWeight += keyword.weight * count;
      matchedHamWords.push({ word: keyword.word, influence: -keyword.weight * count });
    }
  }
  
  // Additional heuristics
  
  // Check for excessive capitalization
  const capitalizedChars = content.replace(/[^A-Z]/g, '').length;
  const totalChars = content.replace(/\s/g, '').length;
  if (totalChars > 0 && capitalizedChars / totalChars > 0.3) {
    spamScore += 0.7;
    totalWeight += 0.7;
    matchedSpamWords.push({ word: "EXCESSIVE CAPS", influence: 0.7 });
  }
  
  // Check for excessive punctuation
  const exclamationCount = (content.match(/!/g) || []).length;
  if (exclamationCount > 3) {
    spamScore += 0.5;
    totalWeight += 0.5;
    matchedSpamWords.push({ word: "!!!", influence: 0.5 });
  }
  
  // Check for URLs
  const urlCount = (content.match(/https?:\/\/|www\./g) || []).length;
  if (urlCount > 0) {
    spamScore += 0.4 * urlCount;
    totalWeight += 0.4 * urlCount;
    matchedSpamWords.push({ word: "URLs", influence: 0.4 * urlCount });
  }
  
  // Calculate final score
  let finalScore = 0.5; // Default neutral score
  if (totalWeight > 0) {
    finalScore = spamScore / totalWeight;
  }
  
  // Combine matched words for word influence
  const wordInfluence = [...matchedSpamWords, ...matchedHamWords].sort((a, b) => 
    Math.abs(b.influence) - Math.abs(a.influence)
  );
  
  // Determine if it's spam based on the score
  const isSpam = finalScore > 0.5;
  const confidence = Math.abs(finalScore - 0.5) * 2; // Convert to 0-1 range
  
  return {
    prediction: isSpam ? "spam" : "ham",
    confidence: Math.min(0.98, 0.5 + confidence), // Cap at 98%
    wordInfluence: wordInfluence
  };
}

export function EmailAnalysisPanel() {
  const [emailContent, setEmailContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState("Enhanced Naive Bayes")
  const [translateToEnglish, setTranslateToEnglish] = useState(false)
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dropAreaRef = useRef<HTMLDivElement>(null)
  const [result, setResult] = useState<{ prediction: string; confidence: number; wordInfluence: WordInfluence[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<any | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }
  
  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        const content = event.target.result as string
        
        // Check if it's a CSV file for bulk analysis
        if (file.name.toLowerCase().endsWith('.csv')) {
          // For CSV files, we'll handle bulk analysis
          handleBulkAnalysis(content)
          return
        }
        
        // For regular files
        setEmailContent(content)
        // Simulate language detection
        setTimeout(() => {
          setDetectedLanguage("English")
        }, 500)
      }
    }
    reader.readAsText(file)
  }
  
  const handleBulkAnalysis = async (csvContent: string) => {
    setIsLoading(true)
    try {
      // Parse CSV content
      const lines = csvContent.split('\\n').filter(line => line.trim())
      if (lines.length === 0) {
        toast.error("CSV file is empty")
        return
      }
      
      // Extract messages from CSV (assuming one message per line)
      const messages = lines.map(line => line.trim())
      
      // Show a preview in the textarea
      setEmailContent(`Bulk analysis of ${messages.length} messages from CSV file.\\n\\nPreview of first message:\\n${messages[0].substring(0, 200)}${messages[0].length > 200 ? '...' : ''}`)
      
      // Simulate API call for bulk analysis
      toast.info(`Processing ${messages.length} messages...`, {
        duration: 3000
      })
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Analyze each message
      const results = messages.map(message => {
        const analysis = analyzeEmail(message)
        return {
          message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
          prediction: analysis.prediction,
          confidence: Math.round(analysis.confidence * 100),
          wordInfluence: analysis.wordInfluence
        }
      })
      
      // Calculate statistics
      const spamCount = results.filter(r => r.prediction === 'spam').length
      const hamCount = results.filter(r => r.prediction === 'ham').length
      
      // Create a batch ID for this analysis
      const batchId = `batch-${Date.now()}`
      
      // Save results to localStorage
      const userId = localStorage.getItem('user_id')
      if (userId) {
        // Save batch report
        const reports = JSON.parse(localStorage.getItem('bulk_reports') || '{}')
        if (!reports[userId]) {
          reports[userId] = []
        }
        
        reports[userId].unshift({
          id: batchId,
          timestamp: new Date().toISOString(),
          total_emails: messages.length,
          spam_count: spamCount,
          ham_count: hamCount,
          results: results
        })
        
        // Keep only the last 10 reports
        if (reports[userId].length > 10) {
          reports[userId] = reports[userId].slice(0, 10)
        }
        
        localStorage.setItem('bulk_reports', JSON.stringify(reports))
      }
      
      // Show success toast
      toast.success(`Bulk analysis complete`, {
        description: `Analyzed ${messages.length} messages: ${spamCount} spam, ${hamCount} ham`
      })
      
      // Dispatch event for results panel
      const event = new CustomEvent("bulkAnalysisComplete", { 
        detail: { 
          batchId,
          totalMessages: messages.length,
          spamCount,
          hamCount
        } 
      })
      window.dispatchEvent(event)
      
    } catch (error) {
      console.error("Error in bulk analysis:", error)
      toast.error("Failed to process CSV file", {
        description: "Please check the file format and try again."
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailContent.trim()) {
      toast.error("Please enter a message to analyze");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const response = await makeApiRequest('/predict', {
        method: 'POST',
        body: JSON.stringify({ message: emailContent })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Get the first prediction from the results
      const prediction = data.predictions[0];
      
      // Create the result object
      const result = {
        prediction: prediction.prediction,
        confidence: prediction.confidence,
        word_influence: prediction.word_influence
      };

      // Set the result in state
      setAnalysisResult(result);

      // Dispatch the result event
      const event = new CustomEvent("emailAnalyzed", {
        detail: {
          result,
          model: selectedModel
        }
      });
      window.dispatchEvent(event);

      // Save to scan history
      const userId = "demo"; // Use demo user for now
      const reports = JSON.parse(localStorage.getItem('bulk_reports') || '{}');
      if (!reports[userId]) {
        reports[userId] = [];
      }
      
      reports[userId].unshift({
        id: `scan-${Date.now()}`,
        message: emailContent,
        prediction: result.prediction,
        confidence: result.confidence,
        timestamp: new Date().toISOString(),
        word_influence: result.word_influence
      });
      
      // Keep only the last 50 scans
      if (reports[userId].length > 50) {
        reports[userId] = reports[userId].slice(0, 50);
      }
      
      localStorage.setItem('bulk_reports', JSON.stringify(reports));

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze email');
      
      // Dispatch error event
      const event = new CustomEvent("apiError", {
        detail: {
          message: err instanceof Error ? err.message : 'Failed to analyze email'
        }
      });
      window.dispatchEvent(event);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEmailContent(e.target.value)
    if (e.target.value.trim()) {
      // Simulate language detection when text changes
      setTimeout(() => {
        setDetectedLanguage("English")
      }, 500)
    } else {
      setDetectedLanguage(null)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Email Analysis</CardTitle>
        <CardDescription>Paste an email or upload a file to analyze for spam content.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-content">Email Content</Label>
          <div 
            ref={dropAreaRef}
            className={`relative border-2 ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' : 'border-transparent'} rounded-md transition-colors`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Textarea
              id="email-content"
              placeholder="Paste your email content here or drag & drop a file..."
              className="min-h-[200px] resize-none"
              value={emailContent}
              onChange={handleTextChange}
            />
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-indigo-50/90 dark:bg-indigo-950/90 rounded-md">
                <div className="flex flex-col items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Upload className="h-10 w-10" />
                  <p className="font-medium">Drop file to analyze</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => document.getElementById("file-upload")?.click()}>
              <FileUp className="mr-2 h-4 w-4" />
              Upload File
            </Button>
            <input id="file-upload" type="file" accept=".txt,.eml,.csv" className="hidden" onChange={handleFileUpload} />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <AlertCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Supported file formats: .txt, .eml, .csv (for bulk analysis)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Model: {selectedModel}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSelectedModel("Enhanced Naive Bayes")}>
                Enhanced Naive Bayes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedModel("Advanced Heuristic Model")}>
                Advanced Heuristic Model
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {detectedLanguage && (
          <div className="flex items-center justify-between border rounded-md p-3 bg-muted/50">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Detected Language: <strong>{detectedLanguage}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="translate" className="text-sm cursor-pointer">
                Translate to English
              </Label>
              <Switch
                id="translate"
                checked={translateToEnglish}
                onCheckedChange={setTranslateToEnglish}
                disabled={detectedLanguage === "English"}
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-indigo-600 hover:bg-indigo-700"
          onClick={handleSubmit}
          disabled={!emailContent.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Check Spam"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}