"use server";

import axios from "axios";
import * as cheerio from "cheerio";
import {
  extractCurrency,
  extractDescription,
  extractPrice,
} from "../utils";

export async function scrapeAmazonProduct(url: string) {
  if (!url) return null;

  const username = process.env.BRIGHT_DATA_USERNAME!;
  const password = process.env.BRIGHT_DATA_PASSWORD!;
  const port = 22225;
  const session_id = Math.floor(Math.random() * 1000000);

  console.log("--------------------------------------------------");
  console.log("Attempting scrape:", url);

  try {
    const response = await axios.get(url, {
  proxy: {
    host: "brd.superproxy.io",
    port: 22225,
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
  },
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
  },
});


    //  DEBUG LOGS
    console.log("Response status:", response.status);
    console.log("HTML length:", response.data?.length);

    const $ = cheerio.load(response.data);

    // CAPTCHA detection
    const isBlocked =
      $("title").text().toLowerCase().includes("captcha") ||
      $("body").text().toLowerCase().includes("enter the characters");

    if (isBlocked) {
      console.warn("⚠ CAPTCHA detected. Skipping product.");
      return null;
    }


    const title = $("#productTitle").text().trim();

    // Price extraction
    const currentPrice = extractPrice(
      $(".priceToPay span.a-price-whole"),
      $("#corePrice_feature_div span.a-offscreen"),
      $(".a-offscreen")
    );

    const originalPrice = extractPrice(
      $("#priceblock_ourprice"),
      $("#priceblock_dealprice"),
      $(".a-price.a-text-price span.a-offscreen")
    );

    console.log("Extracted title:", title);
    console.log("Extracted currentPrice:", currentPrice);
    console.log("Extracted originalPrice:", originalPrice);

    if (!title || (!currentPrice && !originalPrice)) {
      console.warn("Missing title or price. Likely layout change or block.");
      return null;
    }

    const priceValue = Number(currentPrice) || Number(originalPrice);

    const imageData =
      $("#landingImage").attr("data-a-dynamic-image") || "{}";

    const imageUrls = Object.keys(JSON.parse(imageData));

    const productData = {
      url,
      currency: extractCurrency($(".a-price-symbol")) || "₹",
      image: imageUrls[0] || "",
      title,
      currentPrice: priceValue,
      originalPrice: Number(originalPrice) || priceValue,
      priceHistory: [{ price: priceValue }],
      discountRate: 0,
      category: "category",
      reviewsCount: 100,
      stars: 4.5,
      isOutOfStock: false,
      description: extractDescription($),
      lowestPrice: priceValue,
      highestPrice: priceValue,
      averagePrice: priceValue,
    };

    console.log("Scrape success for:", title);
    console.log("--------------------------------------------------");

    return productData;
  } catch (error: any) {
    console.error("Scrape failed:", error.message);
    console.log("--------------------------------------------------");
    return null;
  }
}
