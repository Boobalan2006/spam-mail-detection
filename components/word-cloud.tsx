"use client"

import { useEffect, useRef } from "react"

interface Word {
  word: string
  weight: number
}

interface WordCloudProps {
  words: Word[]
}

export function WordCloud({ words }: WordCloudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || words.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    ctx.scale(dpr, dpr)

    // Draw word cloud
    const centerX = canvas.width / (2 * dpr)
    const centerY = canvas.height / (2 * dpr)
    const maxFontSize = 36
    const minFontSize = 14

    // Sort words by weight for better placement
    const sortedWords = [...words].sort((a, b) => b.weight - a.weight)

    // Place words
    const placedWords: Array<{
      word: string
      x: number
      y: number
      width: number
      height: number
    }> = []

    sortedWords.forEach((wordObj) => {
      const fontSize = minFontSize + (maxFontSize - minFontSize) * wordObj.weight
      ctx.font = `${fontSize}px sans-serif`
      ctx.fillStyle = `hsl(${Math.floor(210 + wordObj.weight * 60)}, ${Math.floor(70 + wordObj.weight * 30)}%, ${Math.floor(40 + wordObj.weight * 20)}%)`

      const textMetrics = ctx.measureText(wordObj.word)
      const wordWidth = textMetrics.width
      const wordHeight = fontSize

      // Try to find a position for the word
      let placed = false
      let attempts = 0
      const maxAttempts = 100

      while (!placed && attempts < maxAttempts) {
        // Calculate position with some randomness but weighted toward center
        const angle = Math.random() * 2 * Math.PI
        const distance = Math.random() * Math.min(centerX, centerY) * 0.8

        const x = centerX + Math.cos(angle) * distance - wordWidth / 2
        const y = centerY + Math.sin(angle) * distance + wordHeight / 4

        // Check if this position overlaps with any placed words
        const overlaps = placedWords.some((placedWord) => {
          return !(
            x + wordWidth < placedWord.x ||
            x > placedWord.x + placedWord.width ||
            y - wordHeight > placedWord.y ||
            y < placedWord.y - placedWord.height
          )
        })

        if (!overlaps && x > 0 && x + wordWidth < canvas.width / dpr && y > wordHeight && y < canvas.height / dpr) {
          // Place the word
          ctx.fillText(wordObj.word, x, y)
          placedWords.push({
            word: wordObj.word,
            x,
            y,
            width: wordWidth,
            height: wordHeight,
          })
          placed = true
        }

        attempts++
      }

      // If we couldn't place the word after max attempts, place it anyway
      if (!placed) {
        const x = centerX - wordWidth / 2
        const y = centerY
        ctx.fillText(wordObj.word, x, y)
      }
    })
  }, [words])

  return (
    <div className="w-full h-[200px] relative">
      <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
    </div>
  )
}
