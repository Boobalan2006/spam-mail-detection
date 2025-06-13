"use client"

import { useState } from "react"
import { BulkAnalysisPanel } from "./bulk-analysis-panel-fixed"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function BulkAnalysisTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Email Analysis</CardTitle>
        <CardDescription>Upload and analyze multiple emails at once.</CardDescription>
      </CardHeader>
      <CardContent>
        <BulkAnalysisPanel />
      </CardContent>
    </Card>
  )
}