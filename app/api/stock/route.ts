import { NextResponse } from "next/server"
import { fetchGlobalQuote, parseGlobalQuote } from "@/lib/alpha-vantage"
import { ALPHA_VANTAGE_API_KEY } from "@/app/api/config"

// Simple in-memory cache with expiration
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

export async function GET(request: Request) {
  // Get the symbol from the query parameters
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
    const cacheKey = `stock_${symbol}`
    const cachedData = cache.get(cacheKey)
    const now = Date.now()

    if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
      return NextResponse.json(cachedData.data)
    }

    // Fetch fresh data from Alpha Vantage
    const data = await fetchGlobalQuote(symbol)
    const stockData = parseGlobalQuote(data, symbol)

    // Update cache
    cache.set(cacheKey, { data: stockData, timestamp: now })

    return NextResponse.json(stockData)
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error)

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

      if (error.message.includes("No data found")) {
        return NextResponse.json({ error: `Stock data not found for symbol: ${symbol}` }, { status: 404 })
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Failed to fetch stock data" }, { status: 500 })
  }
}
