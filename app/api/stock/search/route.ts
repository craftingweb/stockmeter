import { NextResponse } from "next/server"
import { searchSymbol } from "@/lib/alpha-vantage"
import { ALPHA_VANTAGE_API_KEY } from "@/app/api/config"

// Simple in-memory cache with expiration
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")

  if (!query) {
    return NextResponse.json({ error: "Search query is required" }, { status: 400 })
  }

  try {
    // Check if API key is available
    if (!ALPHA_VANTAGE_API_KEY) {
      return NextResponse.json({ error: "API configuration error. API key is not configured." }, { status: 500 })
    }

    // Check cache first
    const cacheKey = `search_${query.toLowerCase()}`
    const cachedData = cache.get(cacheKey)
    const now = Date.now()

    if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
      return NextResponse.json(cachedData.data)
    }

    // Fetch fresh data from Alpha Vantage
    const data = await searchSymbol(query)

    const matches = data["bestMatches"] || []

    const results = {
      results: matches.map((match: any) => ({
        symbol: match["1. symbol"],
        name: match["2. name"],
        type: match["3. type"],
        region: match["4. region"],
        currency: match["8. currency"],
      })),
    }

    // Update cache
    cache.set(cacheKey, { data: results, timestamp: now })

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error searching stocks:", error)

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

    return NextResponse.json({ error: "Failed to search stocks" }, { status: 500 })
  }
}
