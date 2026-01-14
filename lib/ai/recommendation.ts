import { Product } from "@/types";

export async function getAIRecommendation(product: Product) {
  const n = product.priceHistory.length;

  // 🔴 FALLBACK (cold start)
  if (n < 2) {
    return {
      action: "WAIT",
      reason: "Not enough data. Tracking just started.",
      confidence: "Low",
    };
  }

  // 🟡 MINIMUM DATA (2–4)
  if (n < 5) {
    return {
      action:
        product.currentPrice <= product.averagePrice
          ? "BUY NOW"
          : "WAIT",
      reason: "Using recent average price comparison.",
      confidence: "Medium",
    };
  }

  // 🟢 PROPHET (5+)
  try {
    const res = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceHistory: product.priceHistory,
      }),
    });

    const data = await res.json();

    if (!data.predicted_price) throw new Error();

    return {
      action:
        data.predicted_price < product.currentPrice
          ? "WAIT"
          : "BUY NOW",
      reason: `Predicted 7-day price: ₹${data.predicted_price}`,
      confidence: "High",
    };
  } catch {
    return {
      action: "WAIT",
      reason: "Prediction service unavailable.",
      confidence: "Medium",
    };
  }
}
