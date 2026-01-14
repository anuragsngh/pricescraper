"use server";

import { PriceHistoryItem } from "@/types";

export async function getPricePrediction(
  priceHistory: PriceHistoryItem[]
) {
  const mlData = priceHistory.map((item, index) => ({
    day: index,
    price: item.price,
  }));

  const res = await fetch("http://127.0.0.1:8000/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prices: mlData }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error("ML service failed");

  return res.json();
}
