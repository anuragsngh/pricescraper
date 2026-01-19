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
    timeout: 20000, 
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-IN,en;q=0.9",
    },
  };

  try {
    const response = await axios.get(url, options);

    console.log("SCRAPED HTML LENGTH:", response.data?.length);

    const $ = cheerio.load(response.data);

    const title = $("#productTitle").text().trim();

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

    const outOfStock = $("#availability span")
      .text()
      .trim()
      .toLowerCase()
      .includes("unavailable");

    const images =
      $("#imgBlkFront").attr("data-a-dynamic-image") ||
      $("#landingImage").attr("data-a-dynamic-image") ||
      "{}";

    const imageUrls = Object.keys(JSON.parse(images));

    const currency = extractCurrency($(".a-price-symbol"));

    const discountRate = $(".savingsPercentage")
      .text()
      .replace(/[-%]/g, "");

    const description = extractDescription($);

    if (!title || (!currentPrice && !originalPrice)) {
      console.warn("Amazon scrape blocked or incomplete. Skipping.");
      return null;
    }

    const priceValue = Number(currentPrice) || Number(originalPrice);

    return {
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
  } catch (error: any) {
    if (error?.response?.status === 500) {
      console.warn("Amazon returned 500 — retry next cron run");
      return null;
    }

    if (error?.code === "ECONNABORTED") {
      console.warn("Amazon request timed out");
      return null;
    }

    console.error("Amazon scrape error:", error.message);
    return null;
  }
}
