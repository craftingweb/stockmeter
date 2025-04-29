import { ALPHA_VANTAGE_API_KEY, ALPHA_VANTAGE_BASE_URL } from "@/app/api/config"

// Utility functions for Alpha Vantage API

export async function fetchGlobalQuote(symbol: string) {
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error("API key not configured")
  }

  const response = await fetch(
    `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`,
  )

  if (!response.ok) {
    throw new Error(`Alpha Vantage API responded with status: ${response.status}`)
  }

  const data = await response.json()

  // Check for error messages
  if (data["Error Message"]) {
    throw new Error(data["Error Message"])
  }

  // Check for information messages (like exceeded API calls)
  if (data["Information"]) {
    throw new Error(data["Information"])
  }

  return data
}

export async function fetchTimeSeriesDaily(symbol: string, outputSize: "compact" | "full" = "compact") {
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error("API key not configured")
  }

  const response = await fetch(
    `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputSize}&apikey=${ALPHA_VANTAGE_API_KEY}`,
  )

  if (!response.ok) {
    throw new Error(`Alpha Vantage API responded with status: ${response.status}`)
  }

  const data = await response.json()

  // Check for error messages
  if (data["Error Message"]) {
    throw new Error(data["Error Message"])
  }

  // Check for information messages (like exceeded API calls)
  if (data["Information"]) {
    throw new Error(data["Information"])
  }

  return data
}

export async function searchSymbol(keywords: string) {
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error("API key not configured")
  }

  const response = await fetch(
    `${ALPHA_VANTAGE_BASE_URL}?function=SYMBOL_SEARCH&keywords=${keywords}&apikey=${ALPHA_VANTAGE_API_KEY}`,
  )

  if (!response.ok) {
    throw new Error(`Alpha Vantage API responded with status: ${response.status}`)
  }

  const data = await response.json()

  // Check for error messages
  if (data["Error Message"]) {
    throw new Error(data["Error Message"])
  }

  // Check for information messages (like exceeded API calls)
  if (data["Information"]) {
    throw new Error(data["Information"])
  }

  return data
}

// Parse the Global Quote response into our StockData format
export function parseGlobalQuote(data: any, symbol: string) {
  const quote = data["Global Quote"]

  if (!quote || Object.keys(quote).length === 0) {
    throw new Error(`No data found for symbol: ${symbol}`)
  }

  const price = Number.parseFloat(quote["05. price"])
  const previousClose = Number.parseFloat(quote["08. previous close"])
  const change = Number.parseFloat(quote["09. change"])
  const changePercent = Number.parseFloat(quote["10. change percent"].replace("%", ""))

  return {
    symbol: quote["01. symbol"],
    price,
    change,
    changePercent,
    previousClose,
    lastUpdated: new Date().toISOString(),
  }
}
