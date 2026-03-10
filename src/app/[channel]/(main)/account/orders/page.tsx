import { CurrentUserOrdersPaginatedDocument } from "@/gql/graphql";
import { executeAuthenticatedGraphQL } from "@/lib/graphql";
import { OrderRow } from "@/ui/components/account/order-row";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { Button } from "@/ui/components/ui/button";
import { accountRoutes } from "@/ui/components/account/routes";

const ORDERS_PER_PAGE = 10;

type Props = {
	searchParams: Promise<{ after?: string }>;
};

export default async function AccountOrdersPage({ searchParams }: Props) {
	const { after } = await searchParams;

	const result = await executeAuthenticatedGraphQL(CurrentUserOrdersPaginatedDocument, {
		variables: {
			first: ORDERS_PER_PAGE,
			after: after || null,
		},
		cache: "no-cache",
	});

	if (!result.ok || !result.data.me) {
		return null;
	}

	const ordersConnection = result.data.me.orders;
	const orders = ordersConnection?.edges ?? [];
	const pageInfo = ordersConnection?.pageInfo;
	const totalCount = ordersConnection?.totalCount ?? 0;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">订单</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					{totalCount === 0 ? "暂无订单" : `${totalCount} 份订单`}
				</p>
			</div>

			{orders.length === 0 ? (
				<div className="rounded-lg border border-dashed p-8 text-center">
					<p className="text-muted-foreground">您尚未下达任何订单。</p>
				</div>
			) : (
				<>
					<div className="space-y-2">
						{orders.map(({ node: order }) => (
							<OrderRow key={order.id} order={order} />
						))}
					</div>

					{pageInfo?.hasNextPage && pageInfo.endCursor && (
						<div className="flex justify-center pt-2">
							<LinkWithChannel href={`${accountRoutes.orders}?after=${pageInfo.endCursor}`}>
								<Button variant="outline-solid">加载更多订单</Button>
							</LinkWithChannel>
						</div>
					)}
				</>
			)}
		</div>
	);
}
