import { ChevronRight } from "lucide-react";
import { CurrentUserOrdersPaginatedDocument } from "@/gql/graphql";
import { executeAuthenticatedGraphQL } from "@/lib/graphql";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { OrderRow } from "@/ui/components/account/order-row";
import { AccountAddressCard } from "@/ui/components/account/address-card";
import { accountRoutes } from "@/ui/components/account/routes";
import { getCurrentUser } from "./get-current-user";

export default async function AccountOverviewPage() {
	const [user, ordersResult] = await Promise.all([
		getCurrentUser(),
		executeAuthenticatedGraphQL(CurrentUserOrdersPaginatedDocument, {
			variables: { first: 3, after: null },
			cache: "no-cache",
		}),
	]);

	const orders = ordersResult.ok ? ordersResult.data.me?.orders?.edges ?? [] : [];
	const defaultAddress = user
		? user.addresses.find((a) => a.id === user.defaultShippingAddress?.id) ?? user.addresses[0]
		: null;

	const displayName = user?.firstName || user?.email.split("@")[0] || "";

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">欢迎回来，{displayName}</h1>
				<p className="mt-1 text-sm text-muted-foreground">这是您账户活动的概览。</p>
			</div>

			<section>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold">最近订单</h2>
					{orders.length > 0 && (
						<LinkWithChannel
							href={accountRoutes.orders}
							className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
						>
							查看全部
							<ChevronRight className="h-4 w-4" />
						</LinkWithChannel>
					)}
				</div>

				{orders.length === 0 ? (
					<div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
						您还没有下过任何订单。
					</div>
				) : (
					<div className="space-y-2">
						{orders.map(({ node: order }) => (
							<OrderRow key={order.id} order={order} />
						))}
					</div>
				)}
			</section>

			<section>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold">默认地址</h2>
					<LinkWithChannel
						href={accountRoutes.addresses}
						className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						管理
						<ChevronRight className="h-4 w-4" />
					</LinkWithChannel>
				</div>

				{defaultAddress ? (
					<AccountAddressCard address={defaultAddress} isDefaultShipping />
				) : (
					<div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
						尚未保存任何地址。
					</div>
				)}
			</section>
		</div>
	);
}
