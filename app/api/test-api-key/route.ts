import { NextResponse } from "next/server"
import { ALPHA_VANTAGE_API_KEY, ALPHA_VANTAGE_BASE_URL } from "@/app/api/config"

export async function GET() {
  try {
    if (!ALPHA_VANTAGE_API_KEY) {
      return NextResponse.json({ error: "API key not found" }, { status: 500 })
    }

    // Test the API key with a simple request
    const response = await fetch(
      `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=IBM&apikey=${ALPHA_VANTAGE_API_KEY}`,
    )

    if (!response.ok) {
      throw new Error(`Alpha Vantage API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Check if the response contains an error message about the API key
    if (data["Error Message"] && data["Error Message"].includes("apikey")) {
      return NextResponse.json({ error: "Invalid API key", details: data }, { status: 401 })
    }

    // If we got here, the API key is working
    return NextResponse.json({
      success: true,
      message: "API key is valid and working",
      // Return a small sample of the data to confirm it's working
      sample: data["Global Quote"]
        ? {
            symbol: data["Global Quote"]["01. symbol"],
            price: data["Global Quote"]["05. price"],
          }
        : data,
    })
  } catch (error) {
    console.error("Error testing API key:", error)
    return NextResponse.json(
      {
        error: "Failed to test API key",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
