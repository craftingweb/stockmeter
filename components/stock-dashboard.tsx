"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Search, RefreshCw, AlertCircle } from "lucide-react"
import StockTable from "./stock-table"
import StockChart from "./stock-chart"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Default stocks to display
const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "META"]

export type StockData = {
  symbol: string
  price: number
  change: number
  changePercent: number
  previousClose: number
  lastUpdated: string
}

export default function StockDashboard() {
  const [stocks, setStocks] = useState<StockData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchSymbol, setSearchSymbol] = useState("")
  const [searchResults, setSearchResults] = useState<
    Array<{
      symbol: string
      name: string
      type: string
      region: string
      currency: string
    }>
  >([])
  const [isSearching, setIsSearching] = useState(false)
  const [apiCallsRemaining, setApiCallsRemaining] = useState(25) // Free tier daily limit
  const apiCallsQueue = useRef<string[]>([])
  const processingQueue = useRef(false)

  // Process API queue with rate limiting
  const processApiQueue = async () => {
    if (processingQueue.current || apiCallsQueue.current.length === 0) {
      return
    }

    processingQueue.current = true

    try {
      // Process up to 5 symbols at a time (rate limit)
      const batch = apiCallsQueue.current.splice(0, 5)
      setLoading(true)

      const results = await Promise.allSettled(batch.map((symbol) => fetchStockData(symbol)))

      const validResults = results
        .filter(
          (result): result is PromiseFulfilledResult<StockData> =>
            result.status === "fulfilled" && result.value !== null,
        )
        .map((result) => result.value)

      setStocks((prev) => {
        // Merge new results with existing stocks, avoiding duplicates
        const symbolsMap = new Map(prev.map((stock) => [stock.symbol, stock]))
        validResults.forEach((stock) => symbolsMap.set(stock.symbol, stock))
        return Array.from(symbolsMap.values())
      })

      // Update API calls remaining
      setApiCallsRemaining((prev) => Math.max(0, prev - batch.length))

      // If we have more in the queue, wait 60 seconds before processing the next batch
      if (apiCallsQueue.current.length > 0) {
        setTimeout(() => {
          processingQueue.current = false
          processApiQueue()
        }, 60 * 1000) // Wait 60 seconds for rate limit
      } else {
        processingQueue.current = false
      }
    } catch (error) {
      console.error("Error processing API queue:", error)
      processingQueue.current = false
    } finally {
      setLoading(false)
    }
  }

  const fetchStockData = async (symbol: string) => {
    try {
      const response = await fetch(`/api/stock?symbol=${symbol}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to fetch data for ${symbol}`)
      }

      const data = await response.json()
      return data
    } catch (err) {
      console.error(`Error fetching ${symbol}:`, err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      return null
    }
  }

  const fetchAllStocks = () => {
    setError(null)

    // Clear existing queue
    apiCallsQueue.current = []

    // Add default symbols to queue
    apiCallsQueue.current.push(...DEFAULT_SYMBOLS)

    // Start processing
    processApiQueue()
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) return

    setSearchSymbol(searchQuery.toUpperCase())
    setSearchResults([])

    // Add to queue and process
    apiCallsQueue.current.push(searchQuery.toUpperCase())
    processApiQueue()
  }

  const searchSymbols = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)

    try {
      const response = await fetch(`/api/stock/search?query=${encodeURIComponent(query)}`)

      if (!response.ok) {
        throw new Error("Failed to search symbols")
      }

      const data = await response.json()
      setSearchResults(data.results || [])
    } catch (error) {
      console.error("Error searching symbols:", error)
    } finally {
      setIsSearching(false)
    }
  }

  // Add debouncing to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      searchSymbols(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Start processing the queue when it changes
  useEffect(() => {
    processApiQueue()
  }, [apiCallsQueue.current.length])

  useEffect(() => {
    fetchAllStocks()
    // Set up a refresh interval (every 5 minutes)
    const intervalId = setInterval(fetchAllStocks, 5 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, [])

  const filteredStocks = stocks.filter((stock) => (searchSymbol ? stock.symbol.includes(searchSymbol) : true))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stock Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Real-time stock prices and performance metrics</p>
        </div>

        <div className="w-full md:w-auto relative">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="Search stock symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64"
            />
            <Button type="submit" disabled={isSearching}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto">
              {searchResults.map((result) => (
                <button
                  key={result.symbol}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                  onClick={() => {
                    setSearchQuery(result.symbol)
                    setSearchResults([])
                  }}
                >
                  <div>
                    <div className="font-medium">{result.symbol}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{result.name}</div>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{result.region}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Market Overview</CardTitle>
            <CardDescription>Last updated: {new Date().toLocaleString()}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAllStocks} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table">
            <TabsList className="mb-4">
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="chart">Chart View</TabsTrigger>
            </TabsList>
            <TabsContent value="table">
              <StockTable stocks={filteredStocks} loading={loading} />
            </TabsContent>
            <TabsContent value="chart">
              <StockChart stocks={filteredStocks} loading={loading} />
            </TabsContent>
          </Tabs>

          <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            API calls remaining today: {apiCallsRemaining}/25
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
