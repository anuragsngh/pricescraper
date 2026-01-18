import { NextResponse } from "next/server";
import Product from "@/lib/models/product.model";
import { connectToDB } from "@/lib/mongoose";
import { scrapeAmazonProduct } from "@/lib/scraper";
import {
  getAveragePrice,
  getHighestPrice,
  getLowestPrice,
} from "@/lib/utils";

export async function GET(req: Request) {
  // 🔐 AUTH CHECK
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connectToDB();

    const products = await Product.find();

    for (const product of products) {
      const scraped = await scrapeAmazonProduct(product.url);
      if (!scraped?.currentPrice) continue;

      const updatedPriceHistory = [
        ...product.priceHistory,
        {
          price: scraped.currentPrice,
          date: new Date(),
        },
      ];

      await Product.findByIdAndUpdate(product._id, {
        currentPrice: scraped.currentPrice,
        priceHistory: updatedPriceHistory,
        lowestPrice: getLowestPrice(updatedPriceHistory),
        highestPrice: getHighestPrice(updatedPriceHistory),
        averagePrice: getAveragePrice(updatedPriceHistory),
      });

      // ⏱ polite delay (VERY IMPORTANT)
      await new Promise((res) => setTimeout(res, 4000));
    }

    return NextResponse.json({
      success: true,
      updatedProducts: products.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
