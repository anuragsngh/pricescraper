export async function getForecast(priceHistory: any[]) {
  const res = await fetch("http://127.0.0.1:8000/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceHistory }),
  });

  const data = await res.json();
  return data.forecast || [];
}
