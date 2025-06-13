"use client"

import { useEffect, useState } from "react"
import { Download, FileText, MoreHorizontal, Loader2, AlertCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { makeApiRequest } from "@/lib/api"

interface ScanHistoryItem {
  id: string;
  message: string;
  prediction: string;
  confidence: number;
  timestamp: string;
}

export function RecentScans() {
  const [scans, setScans] = useState<ScanHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedScan, setSelectedScan] = useState<ScanHistoryItem | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const loadScanHistory = () => {
    try {
      const userId = "demo"; // Use demo user for now
      const reports = JSON.parse(localStorage.getItem('bulk_reports') || '{}');
      const userScans = reports[userId] || [];
      setScans(userScans);
      setLoading(false);
    } catch (err) {
      console.error('Error loading scan history:', err);
      setError('Failed to load scan history');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScanHistory()
    
    // Listen for new scans
    const handleNewScan = () => {
      loadScanHistory()
    }
    
    window.addEventListener('emailAnalyzed', handleNewScan)
    
    return () => {
      window.removeEventListener('emailAnalyzed', handleNewScan)
    }
  }, [])

  const handleViewDetails = (scan: ScanHistoryItem) => {
    setSelectedScan(scan)
    setDetailsOpen(true)
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString()
    } catch (e) {
      return dateString
    }
  }

  const handleDownload = async (scan: ScanHistoryItem) => {
    try {
      setDownloading(scan.id)
      
      // Create CSV content
      const csvContent = [
        ["Scan ID", "Timestamp", "Prediction", "Confidence", "Email Content"],
        [
          scan.id,
          scan.timestamp,
          scan.prediction,
          `${scan.confidence}%`,
          `"${scan.message.replace(/"/g, '""')}"` // Escape quotes for CSV
        ]
      ].map(row => row.join(",")).join("\n")

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `scan_report_${scan.id.substring(0, 8)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success("Report downloaded successfully")
    } catch (error) {
      console.error("Error downloading report:", error)
      toast.error("Failed to download report")
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border rounded-md bg-red-50 text-red-800">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="text-center mb-4">{error}</p>
        <Button 
          onClick={loadScanHistory} 
          variant="outline"
          className="bg-white"
        >
          Retry
        </Button>
      </div>
    )
  }

  if (scans.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No scan history available. Try analyzing some emails first.</p>
      </div>
    )
  }

  return (
    <>
      <div className="w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Email Snippet</TableHead>
              <TableHead className="w-[100px]">Result</TableHead>
              <TableHead className="w-[100px]">Confidence</TableHead>
              <TableHead className="w-[150px]">Timestamp</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scans.map((scan) => (
              <TableRow key={scan.id} className="group">
                <TableCell className="font-medium">{scan.id.substring(0, 8)}</TableCell>
                <TableCell className="max-w-[300px] truncate">{scan.message.substring(0, 50)}...</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      scan.prediction === "spam"
                        ? "bg-red-100 text-red-800 hover:bg-red-200"
                        : "bg-green-100 text-green-800 hover:bg-green-200"
                    }
                  >
                    {scan.prediction}
                  </Badge>
                </TableCell>
                <TableCell>{scan.confidence}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(scan.timestamp)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetails(scan)}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>View Details</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDownload(scan)}
                        disabled={downloading === scan.id}
                      >
                        {downloading === scan.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        <span>
                          {downloading === scan.id ? "Downloading..." : "Download Report"}
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Scan Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Scan Details</DialogTitle>
            <DialogDescription>
              Detailed analysis of the scanned email
            </DialogDescription>
          </DialogHeader>
          {selectedScan && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Scan ID</h3>
                <p className="text-sm text-muted-foreground">{selectedScan.id}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-1">Timestamp</h3>
                <p className="text-sm text-muted-foreground">{formatDate(selectedScan.timestamp)}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-1">Email Content</h3>
                <div className="p-3 bg-muted rounded-md text-sm max-h-[200px] overflow-auto">
                  {selectedScan.message}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-1">Result</h3>
                  <Badge
                    variant="outline"
                    className={
                      selectedScan.prediction === "spam"
                        ? "bg-red-100 text-red-800"
                        : "bg-green-100 text-green-800"
                    }
                  >
                    {selectedScan.prediction}
                  </Badge>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-1">Confidence</h3>
                  <p className="text-sm">{selectedScan.confidence}%</p>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}