"use client";

import { type FC } from "react";
import { type CheckoutFragment } from "@/checkout/graphql";
import { formatShippingPrice } from "@/checkout/lib/utils/money";

interface SummaryRow {
	label: string;
	value: string;
	onChangeStep?: number;
}

interface CheckoutSummaryContextProps {
	checkout: CheckoutFragment;
	/** 要显示的行（联系方式、配送至、配送方式） */
	rows: SummaryRow[];
	/** 当用户点击“更改”时的回调 */
	onGoToStep?: (step: number) => void;
}

/**
 * 显示当前结账状态（联系方式、配送至、配送方式）的摘要上下文。
 * 在配送步骤和支付步骤中使用，以显示先前步骤的上下文。
 */
export const CheckoutSummaryContext: FC<CheckoutSummaryContextProps> = ({ rows, onGoToStep }) => {
	return (
		<section className="divide-y divide-border rounded-lg border border-border text-sm">
			{rows.map((row) => (
				<div key={row.label} className="flex items-start gap-4 p-4">
					<span className="w-16 shrink-0 pt-0.5 text-muted-foreground">{row.label}</span>
					<span className="min-w-0 flex-1 break-words">{row.value}</span>
					{row.onChangeStep !== undefined && onGoToStep && (
						<button
							type="button"
							onClick={() => onGoToStep(row.onChangeStep!)}
							className="shrink-0 text-sm underline underline-offset-2 hover:no-underline"
						>
							更改
						</button>
					)}
				</div>
			))}
		</section>
	);
};

// =============================================================================
// 构建摘要行的辅助函数
// =============================================================================

/** 将地址格式化为单行字符串 */
export function formatAddressLine(address: CheckoutFragment["shippingAddress"]): string {
	if (!address) return "";
	return `${address.streetAddress1}, ${address.city} ${address.postalCode}, ${address.country?.country}`;
}

/** 获取配送方式显示字符串 */
export function formatShippingMethod(checkout: CheckoutFragment): string {
	const deliveryMethod = checkout.deliveryMethod;
	const methodId = deliveryMethod?.__typename === "ShippingMethod" ? deliveryMethod.id : undefined;
	const method = checkout.shippingMethods?.find((m) => m.id === methodId);

	if (!method) return "无";

	const priceStr = formatShippingPrice(checkout.shippingPrice?.gross);

	return `${method.name}${priceStr ? ` · ${priceStr}` : ""}`;
}

/** 为配送步骤构建标准摘要行 */
export function buildShippingSummaryRows(checkout: CheckoutFragment): SummaryRow[] {
	return [
		{ label: "联系方式", value: checkout.email || "", onChangeStep: 1 },
		{ label: "配送至", value: formatAddressLine(checkout.shippingAddress), onChangeStep: 1 },
	];
}

/** 为支付步骤构建标准摘要行 */
export function buildPaymentSummaryRows(checkout: CheckoutFragment): SummaryRow[] {
	const rows: SummaryRow[] = [{ label: "联系方式", value: checkout.email || "", onChangeStep: 1 }];

	// Only show shipping info for physical products
	if (checkout.isShippingRequired) {
		rows.push(
			{ label: "配送至", value: formatAddressLine(checkout.shippingAddress), onChangeStep: 1 },
			{ label: "配送方式", value: formatShippingMethod(checkout), onChangeStep: 2 },
		);
	} else {
		// Digital products - show delivery type instead
		rows.push({ label: "配送类型", value: "数字商品" });
	}

	return rows;
}
