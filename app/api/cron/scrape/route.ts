// import { NextResponse } from "next/server";
// import Product from "@/lib/models/product.model";
// import { connectToDB } from "@/lib/mongoose";
// import { scrapeAmazonProduct } from "@/lib/scraper";
// import {
//   getAveragePrice,
//   getHighestPrice,
//   getLowestPrice,
// } from "@/lib/utils";

// export async function GET(req: Request) {
  
//   const authHeader = req.headers.get("authorization");

//   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//     return NextResponse.json(
//       { error: "Unauthorized" },
//       { status: 401 }
//     );
//   }

//   try {
//     await connectToDB();

//     const product = await Product.findOne().sort({ updatedAt: 1 });

//     if (!product) {
//       return NextResponse.json({
//         success: true,
//         message: "No products found",
//       });
//     }

//     const scraped = await scrapeAmazonProduct(product.url);

//     if (!scraped?.currentPrice) {
//       return NextResponse.json({
//         success: true,
//         message: "Scrape failed or price missing",
//       });
//     }

//     const updatedPriceHistory = [
//       ...product.priceHistory,
//       {
//         price: scraped.currentPrice,
//         date: new Date(),
//       },
//     ];

//     await Product.findByIdAndUpdate(product._id, {
//       currentPrice: scraped.currentPrice,
//       priceHistory: updatedPriceHistory,
//       lowestPrice: getLowestPrice(updatedPriceHistory),
//       highestPrice: getHighestPrice(updatedPriceHistory),
//       averagePrice: getAveragePrice(updatedPriceHistory),
//     });

//     return NextResponse.json({
//       success: true,
//       updatedProduct: product._id.toString(),
//     });
//   } catch (error: any) {
//     return NextResponse.json(
//       { error: error.message },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";
import Product from "@/lib/models/product.model";
import { connectToDB } from "@/lib/mongoose";
import { scrapeAmazonProduct } from "@/lib/scraper";
import {
  getAveragePrice,
  getHighestPrice,
  getLowestPrice,
} from "@/lib/utils";

const DELAY_MS = 5000; 
export async function GET(req: Request) {
 
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDB();

  const products = await Product.find({});
  let updated = 0;
  let failed = 0;

  for (const product of products) {
    try {
      const scraped = await scrapeAmazonProduct(product.url);

      if (!scraped?.currentPrice) {
        failed++;
        continue;
      }

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

      updated++;
      await new Promise((res) => setTimeout(res, DELAY_MS));
    } catch (err) {
      failed++;
      console.error("Cron scrape failed:", err);
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    failed,
    total: products.length,
  });
}
