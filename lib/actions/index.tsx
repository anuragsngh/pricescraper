// "use server"

// import { revalidatePath } from "next/cache";
// import Product from "../models/product.model";
// import { connectToDB } from "../mongoose";
// import { scrapeAmazonProduct } from "../scraper";
// import { getAveragePrice, getHighestPrice, getLowestPrice } from "../utils";


// export async function scrapeAndStoreProduct(productUrl: string) {
//   if(!productUrl) return;

//   try {
//     connectToDB();

//     const scrapedProduct = await scrapeAmazonProduct(productUrl);

//     if(!scrapedProduct) return;

//     let product = scrapedProduct;

//     const existingProduct = await Product.findOne({ url: scrapedProduct.url });

//     if(existingProduct) {
//       const updatedPriceHistory: any = [
//         ...existingProduct.priceHistory,
//         { price: scrapedProduct.currentPrice }
//       ]

//       product = {
//         ...scrapedProduct,
//         priceHistory: updatedPriceHistory,
//         lowestPrice: getLowestPrice(updatedPriceHistory),
//         highestPrice: getHighestPrice(updatedPriceHistory),
//         averagePrice: getAveragePrice(updatedPriceHistory),
//       }
//     }

//     // const newProduct = await Product.findOneAndUpdate(
//     //   { url: scrapedProduct.url },
//     //   product,
//     //   { upsert: true, new: true }
//     // );

//     // revalidatePath(`/products/${newProduct._id}`);
//     const newProduct = await Product.findOneAndUpdate(
//   { url: scrapedProduct.url },
//   product,
//   { upsert: true, new: true }
// );

// revalidatePath(`/products/${newProduct._id}`);
// return newProduct._id.toString();

//   } catch (error: any) {
//     throw new Error(`Failed to create/update product: ${error.message}`)
//   }
// }

// export async function getProductById(productId: string) {
//   try {
//     connectToDB();

//     const product = await Product.findOne({ _id: productId });

//     if(!product) return null;

//     return product;
//   } catch (error) {
//     console.log(error);
//   }
// }

// export async function getAllProducts() {
//   try {
//     connectToDB();

//     const products = await Product.find();

//     return products;
//   } catch (error) {
//     console.log(error);
//   }
// }

// export async function getSimilarProducts(productId: string) {
//   try {
//     connectToDB();

//     const currentProduct = await Product.findById(productId);

//     if(!currentProduct) return null;

//     const similarProducts = await Product.find({
//       _id: { $ne: productId },
//     }).limit(3);

//     return similarProducts;
//   } catch (error) {
//     console.log(error);
//   }
// }
"use server";

import { revalidatePath } from "next/cache";
import Product from "../models/product.model";
import { connectToDB } from "../mongoose";
import { scrapeAmazonProduct } from "../scraper";
import {
  getAveragePrice,
  getHighestPrice,
  getLowestPrice,
} from "../utils";
import { PriceHistoryItem } from "@/types";

const SCRAPE_COOLDOWN_MS = 24 * 60 * 60 * 1000; 

export async function scrapeAndStoreProduct(productUrl: string) {
  if (!productUrl) return null;

  try {
    await connectToDB();

    const scrapedProduct = await scrapeAmazonProduct(productUrl);

    if (
      !scrapedProduct ||
      !scrapedProduct.title ||
      (!scrapedProduct.currentPrice &&
        !scrapedProduct.originalPrice)
    ) {
      return null;
    }

    const existingProduct = await Product.findOne({
      url: scrapedProduct.url,
    });

    if (
      existingProduct &&
      Date.now() - new Date(existingProduct.updatedAt).getTime() <
        SCRAPE_COOLDOWN_MS
    ) {
      return existingProduct._id.toString();
    }

    let productData = scrapedProduct;

    if (existingProduct) {
      const updatedPriceHistory: PriceHistoryItem[] = [
        ...existingProduct.priceHistory,
        {
          price: scrapedProduct.currentPrice,
          date: new Date(),
        },
      ];

      productData = {
        ...scrapedProduct,
        priceHistory: updatedPriceHistory,
        lowestPrice: getLowestPrice(updatedPriceHistory),
        highestPrice: getHighestPrice(updatedPriceHistory),
        averagePrice: getAveragePrice(updatedPriceHistory),
      };
    } else {
      productData.priceHistory = [
        {
          price: scrapedProduct.currentPrice,
          date: new Date(),
        },
      ] as PriceHistoryItem[];
    }

    const newProduct = await Product.findOneAndUpdate(
      { url: scrapedProduct.url },
      productData,
      { upsert: true, new: true }
    );

    revalidatePath(`/products/${newProduct._id}`);

    return newProduct._id.toString();
  } catch (error: any) {
    console.error("scrapeAndStoreProduct error:", error.message);
    return null;
  }
}

export async function getProductById(productId: string) {
  try {
    await connectToDB();
    return await Product.findById(productId);
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getAllProducts() {
  try {
    await connectToDB();
    return await Product.find();
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getSimilarProducts(productId: string) {
  try {
    await connectToDB();

    const currentProduct = await Product.findById(productId);
    if (!currentProduct) return [];

    return await Product.find({
      _id: { $ne: productId },
    }).limit(3);
  } catch (error) {
    console.log(error);
    return [];
  }
}
