"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "@/components/ui/chart"

interface Word {
  word: string
  weight: number
}

interface WordInfluenceChartProps {
  words: Word[]
}

export function WordInfluenceChart({ words }: WordInfluenceChartProps) {
  // Sort words by weight for better visualization
  const sortedWords = [...words].sort((a, b) => b.weight - a.weight).slice(0, 10)

  // Format data for the chart
  const data = sortedWords.map((word) => ({
    name: word.word,
    value: Math.round(word.weight * 100),
  }))

  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
          <YAxis
            type="category"
            dataKey="name"
            width={80}
            tickLine={false}
            axisLine={false}
            style={{ fontSize: "12px" }}
          />
          <Bar
            dataKey="value"
            fill="hsl(215, 70%, 60%)"
            radius={[4, 4, 4, 4]}
            barSize={20}
            label={{
              position: "right",
              formatter: (value) => `${value}%`,
              style: { fontSize: "12px", fill: "#666" },
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
