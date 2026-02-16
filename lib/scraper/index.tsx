"use server";

import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";
import {
  extractCurrency,
  extractDescription,
  extractPrice,
} from "../utils";

export async function scrapeAmazonProduct(url: string) {
  if (!url) return null;

  console.log("------------------------------------------------");
  console.log("Attempting scrape:", url);

  try {
    const username = process.env.BRIGHT_DATA_USERNAME;
    const password = process.env.BRIGHT_DATA_PASSWORD;

    if (!username || !password) {
      console.error("BrightData credentials missing");
      return null;
    }

    const session_id = Math.floor(Math.random() * 1000000);

    // DISABLE SSL VALIDATION (REQUIRED FOR BRIGHTDATA)
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const response = await axios.get(url, {
      httpsAgent,
      proxy: {
        host: "brd.superproxy.io",
        port: 22225,
        auth: {
          username: `${username}-session-${session_id}`,
          password: password,
        },
      },
      timeout: 20000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9",
      },
    });

    console.log("Response status:", response.status);
    console.log("HTML length:", response.data?.length);

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

    const priceValue = Number(currentPrice) || Number(originalPrice);

    if (!title || !priceValue) {
      console.warn("Amazon scrape blocked or missing price");
      return null;
    }

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

    const currency = extractCurrency($(".a-price-symbol")) || "₹";

    const discountRate = $(".savingsPercentage")
      .text()
      .replace(/[-%]/g, "");

    const description = extractDescription($);

    console.log("Scrape success:", title);

    return {
      url,
      currency,
      image: imageUrls[0] || "",
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
    console.error("Scrape failed:", error.message);
    return null;
  }
}
