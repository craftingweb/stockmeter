import { NextResponse } from "next/server"
import { fetchTimeSeriesDaily } from "@/lib/alpha-vantage"
import { ALPHA_VANTAGE_API_KEY } from "@/app/api/config"

// Simple in-memory cache with expiration
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour in milliseconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")?.toUpperCase()

  if (!symbol) {
    return NextResponse.json({ error: "Stock symbol is required" }, { status: 400 })
  }

  try {
    // Check if API key is available
    if (!ALPHA_VANTAGE_API_KEY) {
      return NextResponse.json({ error: "API configuration error. API key is not configured." }, { status: 500 })
    }

    // Check cache first
    const cacheKey = `history_${symbol}`
    const cachedData = cache.get(cacheKey)
    const now = Date.now()

    if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
      return NextResponse.json(cachedData.data)
    }

    // Fetch fresh data from Alpha Vantage
    const data = await fetchTimeSeriesDaily(symbol)

    // Check for error messages
    if (data["Error Message"]) {
      return NextResponse.json({ error: data["Error Message"] }, { status: 404 })
    }

    // Parse the time series data
    const timeSeriesData = data["Time Series (Daily)"]

    if (!timeSeriesData) {
      return NextResponse.json({ error: `No historical data found for symbol: ${symbol}` }, { status: 404 })
    }

    // Format the data for charts
    const chartData = Object.entries(timeSeriesData).map(([date, values]: [string, any]) => ({
      date,
      open: Number.parseFloat(values["1. open"]),
      high: Number.parseFloat(values["2. high"]),
      low: Number.parseFloat(values["3. low"]),
      close: Number.parseFloat(values["4. close"]),
      volume: Number.parseInt(values["5. volume"]),
    }))

    // Sort by date (newest first)
    chartData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const result = {
      symbol,
      data: chartData.slice(0, 30), // Return last 30 days
    }

    // Update cache
    cache.set(cacheKey, { data: result, timestamp: now })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching historical stock data:", error)

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes("Invalid API key")) {
        return NextResponse.json(
          { error: "API configuration error. Please check your Alpha Vantage API key." },
          { status: 500 },
        )
      }

      if (error.message.includes("premium subscription") || error.message.includes("call frequency")) {
        return NextResponse.json({ error: "API rate limit exceeded. Please try again later." }, { status: 429 })
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Failed to fetch historical stock data" }, { status: 500 })
  }
}
