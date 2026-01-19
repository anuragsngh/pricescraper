
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import PriceInfoCard from "@/components/PriceInfoCard";
import ProductCard from "@/components/ProductCard";
import PriceChart, { ChartPoint } from "@/components/PriceChart";

import { getProductById, getSimilarProducts } from "@/lib/actions";
import { getAIRecommendation } from "@/lib/ai/recommendation";
import { formatNumber } from "@/lib/utils";
import { Product } from "@/types";

type Props = {
  params: { id: string };
};

const ProductDetails = async ({ params: { id } }: Props) => {
  const product: Product | null = await getProductById(id);
  if (!product) redirect("/");

  const similarProducts = await getSimilarProducts(id);

  const ai = await getAIRecommendation(product);

const chartData: ChartPoint[] = product.priceHistory.map((item) => ({
  date: new Date(item.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  }),
  price: item.price,
  forecast: undefined, 
}));

chartData.push({
  date: "Forecast",
  price: undefined,
  forecast: Math.round(product.averagePrice),
});


  return (
    <div className="product-container">
      {/* TOP SECTION */}
      <div className="flex gap-28 xl:flex-row flex-col">
        <div className="product-image">
          <Image
            src={product.image}
            alt={product.title}
            width={580}
            height={400}
            className="mx-auto"
          />
        </div>

        <div className="flex-1 flex flex-col">
          {/* HEADER */}
          <div className="flex justify-between items-start gap-5 pb-6">
            <div className="flex flex-col gap-2">
              <p className="text-[28px] text-secondary font-semibold">
                {product.title}
              </p>

              <p className="text-sm text-gray-500">
                Tracking started • {product.priceHistory.length} data points
              </p>

              <Link
                href={product.url}
                target="_blank"
                className="text-base text-black opacity-50"
              >
                Visit Product
              </Link>
            </div>
          </div>

          {/* PRICE */}
          <div className="product-info">
            <p className="text-[34px] text-secondary font-bold">
              {product.currency} {formatNumber(product.currentPrice)}
            </p>
            <p className="text-[21px] text-black opacity-50 line-through">
              {product.currency} {formatNumber(product.originalPrice)}
            </p>
          </div>

          {/* PRICE CARDS */}
          <div className="my-7 flex flex-wrap gap-5">
            <PriceInfoCard
              title="Current Price"
              iconSrc="/assets/icons/price-tag.svg"
              value={`${product.currency} ${formatNumber(product.currentPrice)}`}
            />
            <PriceInfoCard
              title="Average Price"
              iconSrc="/assets/icons/chart.svg"
              value={`${product.currency} ${formatNumber(product.averagePrice)}`}
            />
            <PriceInfoCard
              title="Highest Price"
              iconSrc="/assets/icons/arrow-up.svg"
              value={`${product.currency} ${formatNumber(product.highestPrice)}`}
            />
            <PriceInfoCard
              title="Lowest Price"
              iconSrc="/assets/icons/arrow-down.svg"
              value={`${product.currency} ${formatNumber(product.lowestPrice)}`}
            />
          </div>

          {/* AI BUY / WAIT */}
          <div className="my-6 p-5 rounded-xl border bg-slate-50">
            <p className="text-lg font-semibold text-secondary">
              AI Recommendation
            </p>

            <p
              className={`text-2xl font-bold ${
                ai.action === "BUY NOW"
                  ? "text-green-600"
                  : "text-yellow-600"
              }`}
            >
              {ai.action === "BUY NOW" ? "🛒 BUY NOW" : "⏳ WAIT"}
            </p>

            <p className="text-sm opacity-70 mt-1">
              Reason: {ai.reason}
            </p>

            <p className="text-sm opacity-70">
              Confidence: {ai.confidence}
            </p>
          </div>

          {/* PRICE GRAPH */}
          <PriceChart data={chartData} />
        </div>
      </div>

      {/* DESCRIPTION */}
      <div className="flex flex-col gap-6 mt-16">
        <h3 className="text-2xl text-secondary font-semibold">
          Product Description
        </h3>

        <div className="flex flex-col gap-3 text-sm opacity-80">
          {product.description?.split("\n")}
        </div>
      </div>

      {/* SIMILAR PRODUCTS */}
      {similarProducts.length > 0 && (
        <div className="py-14">
          <p className="section-text">Similar Products</p>

          <div className="flex flex-wrap gap-10 mt-7">
            {similarProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;
