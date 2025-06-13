"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isAuthenticated } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SimplifiedAuth } from "./simplified-auth"

// Default model insights data
const defaultSpamWords = [
  { word: "free", weight: 70 },
  { word: "winner", weight: 80 },
  { word: "prize", weight: 70 },
  { word: "money", weight: 50 },
  { word: "offer", weight: 50 },
  { word: "urgent", weight: 60 },
  { word: "viagra", weight: 90 },
  { word: "click", weight: 50 },
  { word: "cash", weight: 60 },
  { word: "guarantee", weight: 50 }
];

const defaultHamWords = [
  { word: "meeting", weight: 60 },
  { word: "report", weight: 50 },
  { word: "project", weight: 50 },
  { word: "schedule", weight: 60 },
  { word: "update", weight: 40 },
  { word: "document", weight: 50 },
  { word: "team", weight: 40 },
  { word: "regards", weight: 50 },
  { word: "sincerely", weight: 50 },
  { word: "thanks", weight: 40 }
];

interface ScanResult {
  prediction: 'spam' | 'ham';
  message: string;
  wordInfluence: Array<{
    word: string;
    influence: number;
  }>;
  confidence: number;
  timestamp: string;
}

export function ModelInsights() {
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [mostRecentScan, setMostRecentScan] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'general' | 'specific'>('general');

  useEffect(() => {
    const loadScanHistory = () => {
      try {
        setIsLoading(true);
        let allScans: ScanResult[] = [];
        
        // Load individual scans
        const storedHistory = localStorage.getItem('scan_history');
        if (storedHistory) {
          try {
            const history = JSON.parse(storedHistory);
            // Ensure history is an array
            if (Array.isArray(history)) {
              allScans = [...allScans, ...history];
            } else if (typeof history === 'object') {
              // If it's a single scan object, add it to the array
              allScans.push(history as ScanResult);
            }
          } catch (parseError) {
            console.error('Error parsing scan history:', parseError);
          }
        }

        // Load from bulk_reports if available
        const bulkReports = localStorage.getItem('bulk_reports');
        if (bulkReports) {
          try {
            const reports = JSON.parse(bulkReports);
            const demoReports = reports['demo'] || [];
            if (Array.isArray(demoReports)) {
              const bulkScans = demoReports.map((report: any) => ({
                prediction: report.prediction,
                message: report.message,
                wordInfluence: report.word_influence || [],
                confidence: report.confidence,
                timestamp: report.timestamp || new Date().toISOString()
              }));
              allScans = [...allScans, ...bulkScans];
            }
          } catch (parseError) {
            console.error('Error parsing bulk reports:', parseError);
          }
        }
        
        // Sort by timestamp, most recent first
        allScans.sort((a, b) => {
          const dateA = new Date(a.timestamp || 0).getTime();
          const dateB = new Date(b.timestamp || 0).getTime();
          return dateB - dateA;
        });
        
        setScanHistory(allScans);
        
        // Set most recent scan if available
        if (allScans.length > 0) {
          const recentScan = allScans[0];
          // Ensure wordInfluence is properly formatted
          if (recentScan.wordInfluence) {
            recentScan.wordInfluence = recentScan.wordInfluence.map(item => ({
              word: item.word,
              influence: typeof item.influence === 'number' ? item.influence : parseFloat(item.influence)
            }));
          }
          setMostRecentScan(recentScan);
        }
      } catch (error) {
        console.error('Error loading scan history:', error);
        setError('Failed to load scan history');
      } finally {
        setIsLoading(false);
      }
    };

    // Load initial data
    loadScanHistory();

    // Listen for new scans
    const handleNewScan = () => {
      loadScanHistory();
    };

    window.addEventListener('newScan', handleNewScan);
    window.addEventListener('emailAnalyzed', handleNewScan);
    return () => {
      window.removeEventListener('newScan', handleNewScan);
      window.removeEventListener('emailAnalyzed', handleNewScan);
    };
  }, []);

  // Prepare data for charts
  const prepareChartData = (words: any[], limit: number = 10) => {
    return words
      .slice(0, limit)
      .map(item => ({
        word: item.word,
        weight: typeof item.weight === 'number' ? item.weight : parseFloat((item.weight * 100).toFixed(2))
      }))
      .sort((a, b) => a.weight - b.weight)
  }

  const prepareScanInsightData = (wordInfluence: ScanResult['wordInfluence']) => {
    if (!wordInfluence || wordInfluence.length === 0) return [];
    
    return wordInfluence
      .map(item => ({
        word: item.word,
        influence: typeof item.influence === 'number' ? 
          item.influence : 
          parseFloat((item.influence * 100).toFixed(2))
      }))
      .sort((a, b) => Math.abs(b.influence) - Math.abs(a.influence))
      .slice(0, 10); // Show top 10 most influential words
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border rounded-md bg-red-50 text-red-800">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="text-center mb-4">{error}</p>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="bg-white"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'general' | 'specific')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">General Model Insights</TabsTrigger>
          <TabsTrigger value="specific" disabled={!mostRecentScan}>
            Your Latest Scan Insights
            {!mostRecentScan && <span className="ml-2 text-xs">(No Scans)</span>}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-4">
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium mb-4">Top Spam Indicators</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareChartData(defaultSpamWords)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="word" />
                    <Tooltip formatter={(value) => [`${value}%`, "Weight"]} />
                    <Legend
                      content={({ payload }) => (
                        <ul className="flex flex-wrap gap-4 mt-4">
                          {payload?.map((entry, index) => (
                            <li key={`item-${index}`} className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-sm text-gray-600">{entry.value}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    />
                    <Bar dataKey="weight" name="Influence %" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Top Ham (Non-Spam) Indicators</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareChartData(defaultHamWords)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="word" />
                    <Tooltip formatter={(value) => [`${value}%`, "Weight"]} />
                    <Legend
                      content={({ payload }) => (
                        <ul className="flex flex-wrap gap-4 mt-4">
                          {payload?.map((entry, index) => (
                            <li key={`item-${index}`} className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-sm text-gray-600">{entry.value}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    />
                    <Bar dataKey="weight" name="Influence %" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                These charts show the words that most strongly influence the model's classification decision.
                Higher percentages indicate stronger influence on the spam/ham classification.
              </p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="specific" className="mt-4">
          {mostRecentScan ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Latest Scan Analysis</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Showing insights for your most recent scan: {mostRecentScan.prediction === "spam" ? "Spam Detected" : "Ham (Not Spam)"}
                </p>
                
                {mostRecentScan.message && (
                  <div className="p-3 bg-muted rounded-md text-sm mb-6">
                    <strong>Email snippet:</strong> {mostRecentScan.message.length > 100 
                      ? `${mostRecentScan.message.substring(0, 100)}...` 
                      : mostRecentScan.message}
                  </div>
                )}
                
                {mostRecentScan.wordInfluence && mostRecentScan.wordInfluence.length > 0 ? (
                  <>
                    <h4 className="text-md font-medium mb-3">Word Influence Analysis</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={prepareScanInsightData(mostRecentScan.wordInfluence)}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            type="number" 
                            domain={[-100, 100]}
                            tickFormatter={(value) => `${Math.abs(value)}%`}
                          />
                          <YAxis type="category" dataKey="word" />
                          <Tooltip 
                            formatter={(value) => {
                              const absValue = Math.abs(Number(value));
                              return [`${absValue}%`, Number(value) >= 0 ? "Spam Indicator" : "Ham Indicator"];
                            }} 
                          />
                          <Legend
                            content={({ payload }) => (
                              <ul className="flex flex-wrap gap-4 mt-4">
                                {payload?.map((entry, index) => (
                                  <li key={`item-${index}`} className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-sm text-gray-600">{entry.value}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          />
                          <Bar 
                            dataKey="influence" 
                            name="Word Influence" 
                            fill="#8884d8"
                            fillOpacity={0.8}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 border rounded-md">
                    <p>No detailed word influence data available for this scan.</p>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>
                  This chart shows how specific words in your email influenced the classification decision.
                  Positive values (red) indicate words that suggest spam, while negative values (green) suggest legitimate email.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground">No scan insights available. Try analyzing some emails first.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}