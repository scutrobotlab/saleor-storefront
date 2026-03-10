import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { ProductListByCollectionDocument, ProductOrderField, OrderDirection } from "@/gql/graphql";
import { executePublicGraphQL } from "@/lib/graphql";
import { ProductList } from "@/ui/components/product-list";

export const metadata = {
	title: "ACME 店铺, 由 Saleor & Next.js 提供支持",
	description:
		"用于构建高性能电商体验的 Storefront Next.js 示例，基于 Saleor——面向全球品牌的模块化无头商务平台。",
};

/**
 * Cached function to fetch featured products.
 * Returns [] on failure so the page always renders (never null).
 * Note: the empty array IS cached for the cacheLife duration —
 * on-demand revalidation via cacheTag is the intended recovery path.
 */
async function getFeaturedProducts(channel: string) {
	"use cache";
	cacheLife("minutes");
	cacheTag("collection:featured-products");

	const result = await executePublicGraphQL(ProductListByCollectionDocument, {
		variables: {
			slug: "featured-products",
			channel,
			first: 12,
			sortBy: { field: ProductOrderField.Collection, direction: OrderDirection.Asc },
		},
		revalidate: 300,
	});

	if (!result.ok) {
		console.warn(`[Homepage] 未能获取 ${channel} 的特色商品:`, result.error.message);
		return [];
	}

	return result.data.collection?.products?.edges.map(({ node }) => node) ?? [];
}

/**
 * Page shell — renders immediately with a static section wrapper.
 * The async product grid streams inside its own Suspense boundary
 * so it doesn't rely on the layout's main Suspense for reconciliation.
 */
export default function Page(props: { params: Promise<{ channel: string }> }) {
	return (
		<section className="mx-auto max-w-7xl p-8 pb-16">
			<h2 className="sr-only">商品列表</h2>
			<Suspense
				fallback={
					<ul
						role="list"
						data-testid="ProductList"
						className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
					>
						{Array.from({ length: 12 }).map((_, i) => (
							<li key={i} className="animate-pulse">
								<div className="aspect-square overflow-hidden bg-secondary" />
								<div className="mt-2 flex justify-between">
									<div>
										<div className="mt-1 h-4 w-32 rounded bg-secondary" />
										<div className="mt-1 h-4 w-20 rounded bg-secondary" />
									</div>
									<div className="mt-1 h-4 w-16 rounded bg-secondary" />
								</div>
							</li>
						))}
					</ul>
				}
			>
				<FeaturedProducts params={props.params} />
			</Suspense>
		</section>
	);
}

async function FeaturedProducts({ params: paramsPromise }: { params: Promise<{ channel: string }> }) {
	const { channel } = await paramsPromise;
	const products = await getFeaturedProducts(channel);

	return <ProductList products={products} />;
}
