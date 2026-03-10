import { FulfillmentStatus, type OrderFullDetailsFragment } from "@/gql/graphql";
import { formatDate } from "@/lib/utils";

type Props = {
	order: OrderFullDetailsFragment;
};

type TimelineEvent = {
	label: string;
	description: string;
	date: Date;
	isCurrent: boolean;
};

const fulfillmentLabels: Record<FulfillmentStatus, { label: string; description: string }> = {
	[FulfillmentStatus.Fulfilled]: { label: "已发货", description: "您的订单已发货" },
	[FulfillmentStatus.Canceled]: {
		label: "发货已取消",
		description: "发货已取消",
	},
	[FulfillmentStatus.Refunded]: { label: "已退款", description: "款项已退回" },
	[FulfillmentStatus.RefundedAndReturned]: {
		label: "已退款并退货",
		description: "商品已退货并退款",
	},
	[FulfillmentStatus.Replaced]: {
		label: "已更换",
		description: "商品已更换",
	},
	[FulfillmentStatus.Returned]: { label: "已退货", description: "商品已退回" },
	[FulfillmentStatus.WaitingForApproval]: {
		label: "等待批准",
		description: "发货正在等待批准",
	},
};

function buildTimeline(order: OrderFullDetailsFragment): TimelineEvent[] {
	const events: TimelineEvent[] = [];

	events.push({
		label: "订单已确认",
		description: "付款已确认，订单已下达",
		date: new Date(order.created),
		isCurrent: false,
	});

	for (const fulfillment of order.fulfillments) {
		const config = fulfillmentLabels[fulfillment.status] ?? {
			label: fulfillment.status,
			description: "",
		};
		const itemCount = fulfillment.lines?.reduce((sum, l) => sum + l.quantity, 0) ?? 0;
		const description = itemCount > 0 ? `${config.description} (${itemCount} 件商品)` : config.description;

		events.push({
			label: config.label,
			description,
			date: new Date(fulfillment.created),
			isCurrent: false,
		});

		if (fulfillment.trackingNumber) {
			events.push({
				label: "追踪信息已更新",
				description: `追踪号码: ${fulfillment.trackingNumber}`,
				date: new Date(fulfillment.created),
				isCurrent: false,
			});
		}
	}

	events.sort((a, b) => b.date.getTime() - a.date.getTime());

	if (events.length > 0) {
		events[0].isCurrent = true;
	}

	return events;
}

export function OrderTimeline({ order }: Props) {
	const events = buildTimeline(order);

	if (events.length === 0) return null;

	return (
		<div className="rounded-xl border">
			<div className="border-b px-5 py-4">
				<h2 className="text-sm font-semibold">订单时间线</h2>
			</div>
			<div className="px-5 py-4">
				<ol className="relative ml-3 border-l border-border">
					{events.map((event, i) => (
						<li key={i} className="relative mb-6 ml-6 last:mb-0">
							<span
								className={`absolute -left-[calc(1.5rem+5px)] top-1 h-2.5 w-2.5 rounded-full border-2 border-background ${
									event.isCurrent ? "bg-foreground" : "bg-muted-foreground/40"
								}`}
							/>
							<p
								className={`text-sm ${
									event.isCurrent ? "font-semibold" : "font-medium text-muted-foreground"
								}`}
							>
								{event.label}
							</p>
							{event.description && (
								<p className="mt-0.5 text-[13px] text-muted-foreground">{event.description}</p>
							)}
							<p className="mt-0.5 text-[13px] text-muted-foreground">
								<time dateTime={event.date.toISOString()}>{formatDate(event.date)}</time>
							</p>
						</li>
					))}
				</ol>
			</div>
		</div>
	);
}
