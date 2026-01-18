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

  // 🌐 BrightData proxy
  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const session_id = (1000000 * Math.random()) | 0;

  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
    host: "brd.superproxy.io",
    port,
    rejectUnauthorized: false,
  };

  try {
    // 🔄 Fetch page
    const response = await axios.get(url, options);

    // 🔍 STEP 1: DEBUG AMAZON BLOCK
    console.log("SCRAPED HTML LENGTH:", response.data?.length);

    const $ = cheerio.load(response.data);

    // 🏷️ Title
    const title = $("#productTitle").text().trim();

    // 💰 STEP 2: STRONG PRICE SELECTORS
    const currentPrice = extractPrice(
      $(".priceToPay span.a-price-whole"),
      $(".a-price-whole"),
      $(".a-offscreen"),
      $("#corePrice_feature_div span.a-offscreen"),
      $("[data-a-color-price]")
    );

    const originalPrice = extractPrice(
      $("#priceblock_ourprice"),
      $("#priceblock_dealprice"),
      $(".a-price.a-text-price span.a-offscreen"),
      $("#listPrice"),
      $(".a-offscreen")
    );

    // 📦 Stock
    const outOfStock =
      $("#availability span")
        .text()
        .trim()
        .toLowerCase()
        .includes("unavailable");

    // 🖼️ Images
    const images =
      $("#imgBlkFront").attr("data-a-dynamic-image") ||
      $("#landingImage").attr("data-a-dynamic-image") ||
      "{}";

    const imageUrls = Object.keys(JSON.parse(images));

    // 💱 Currency
    const currency = extractCurrency($(".a-price-symbol"));

    // 📉 Discount
    const discountRate = $(".savingsPercentage")
      .text()
      .replace(/[-%]/g, "");

    // 📝 Description
    const description = extractDescription($);

    // 🚫 HARD FAIL GUARD
    if (!title || (!currentPrice && !originalPrice)) {
      console.warn("Amazon scrape failed: missing title or price");
      return null;
    }

    // 📦 FINAL DATA (unchanged shape)
    const priceValue = Number(currentPrice) || Number(originalPrice);

    const data = {
      url,
      currency: currency || "₹",
      image: imageUrls[0],
      title,
      currentPrice: priceValue,
      originalPrice: Number(originalPrice) || priceValue,
      priceHistory: [{ price: priceValue }],
      discountRate: Number(discountRate) || 0,
      category: "category",
      reviewsCount: 100,
      stars: 4.5,
      isOutOfStock: outOfStock,
      description,
      lowestPrice: priceValue,
      highestPrice: priceValue,
      averagePrice: priceValue,
    };

    return data;
  } catch (error: any) {
    console.error("Amazon scrape error:", error.message);
    return null;
  }
}
