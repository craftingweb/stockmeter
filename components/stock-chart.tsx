"use client"

import { useState, useEffect } from "react"
import type { StockData } from "./stock-dashboard"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

interface StockChartProps {
  stocks: StockData[]
  loading: boolean
}

interface HistoricalData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface HistoricalDataResponse {
  symbol: string
  data: HistoricalData[]
}

export default function StockChart({ stocks, loading }: StockChartProps) {
  const [chartType, setChartType] = useState<"price" | "change" | "historical">("price")
  const [selectedStock, setSelectedStock] = useState<string | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([])
  const [loadingHistorical, setLoadingHistorical] = useState(false)

  // Fetch historical data when a stock is selected
  useEffect(() => {
    let shouldFetch = false
    if (chartType === "historical" && selectedStock) {
      shouldFetch = true
      fetchHistoricalData(selectedStock)
    }

    return () => {
      // Cleanup function (if needed)
      if (shouldFetch) {
        // Optionally, you can add cleanup logic here, such as aborting the fetch request
      }
    }
  }, [chartType, selectedStock])

  const fetchHistoricalData = async (symbol: string) => {
    setLoadingHistorical(true)
    try {
      const response = await fetch(`/api/stock/history?symbol=${symbol}`)
      if (!response.ok) {
        throw new Error("Failed to fetch historical data")
      }
      const data: HistoricalDataResponse = await response.json()
      setHistoricalData(data.data)
    } catch (error) {
      console.error("Error fetching historical data:", error)
    } finally {
      setLoadingHistorical(false)
    }
  }

  if (loading) {
    return <Skeleton className="w-full h-[400px] rounded-md" />
  }

  if (stocks.length === 0) {
    return <p className="text-center py-4">No stocks found to display in chart.</p>
  }

  // Prepare data for the chart
  const chartData = stocks.map((stock) => ({
    name: stock.symbol,
    price: stock.price,
    change: stock.change,
    changePercent: stock.changePercent,
  }))

  // If no stock is selected, use the first one
  useEffect(() => {
    if (stocks.length > 0 && !selectedStock) {
      setSelectedStock(stocks[0].symbol)
    }
  }, [stocks, selectedStock])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Select value={chartType} onValueChange={(value) => setChartType(value as any)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Select chart type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price">Price Comparison</SelectItem>
            <SelectItem value="change">Change % Comparison</SelectItem>
            <SelectItem value="historical">Historical Data</SelectItem>
          </SelectContent>
        </Select>

        {chartType === "historical" && (
          <Select value={selectedStock || ""} onValueChange={setSelectedStock}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select stock" />
            </SelectTrigger>
            <SelectContent>
              {stocks.map((stock) => (
                <SelectItem key={stock.symbol} value={stock.symbol}>
                  {stock.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="h-[400px] w-full">
        <ChartContainer
          config={{
            price: {
              label: "Price ($)",
              color: "hsl(var(--chart-1))",
            },
            change: {
              label: "Change (%)",
              color: "hsl(var(--chart-2))",
            },
            close: {
              label: "Close Price ($)",
              color: "hsl(var(--chart-1))",
            },
            volume: {
              label: "Volume",
              color: "hsl(var(--chart-2))",
            },
          }}
        >
          {chartType === "price" && (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `$${value}`} domain={["auto", "auto"]} />
              <Bar dataKey="price" fill="var(--color-price)" name="Price" radius={[4, 4, 0, 0]} />
              <ChartTooltip content={<ChartTooltipContent labelKey="price" />} cursor={false} />
            </BarChart>
          )}

          {chartType === "change" && (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `${value}%`} domain={["auto", "auto"]} />
              <Line
                type="monotone"
                dataKey="changePercent"
                stroke="var(--color-change)"
                name="Change %"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <ChartTooltip content={<ChartTooltipContent labelKey="change" />} cursor={false} />
            </LineChart>
          )}

          {chartType === "historical" &&
            (loadingHistorical ? (
              <Skeleton className="w-full h-full rounded-md" />
            ) : historicalData.length > 0 ? (
              <AreaChart data={historicalData.slice(0, 30).reverse()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                <YAxis tickFormatter={(value) => `$${value}`} domain={["auto", "auto"]} />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="var(--color-close)"
                  fill="var(--color-close)"
                  fillOpacity={0.2}
                  name="Close Price"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelKey="close"
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                  }
                />
              </AreaChart>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p>No historical data available</p>
              </div>
            ))}
        </ChartContainer>
      </div>
    </div>
  )
}
