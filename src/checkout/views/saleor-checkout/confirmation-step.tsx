"use client";

import { type FC, useState } from "react";
import Link from "next/link";
import { CheckCircle, Mail, MapPin, Package } from "lucide-react";
import { type CheckoutFragment } from "@/checkout/graphql";
import { localeConfig } from "@/config/locale";

interface ConfirmationStepProps {
	checkout: CheckoutFragment;
}

/** Format address for display */
function formatAddress(address: CheckoutFragment["shippingAddress"] | CheckoutFragment["billingAddress"]) {
	if (!address) return null;
	return [address.streetAddress1, address.city, address.postalCode, address.country?.country]
		.filter(Boolean)
		.join(", ");
}

/**
 * Order confirmation step (demo version).
 * Shows after successful payment in demo mode.
 * Note: Order summary is shown in the sidebar, so not duplicated here.
 */
export const ConfirmationStep: FC<ConfirmationStepProps> = ({ checkout }) => {
	const channel = checkout.channel.slug;
	const shippingAddress = checkout.shippingAddress;
	const email = checkout.email || "";

	// Generate a demo order number
	const [orderNumber] = useState(() => `DEMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);

	// Calculate estimated delivery (7 days from now)
	const [formattedDelivery] = useState(() => {
		const estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
		return estimatedDelivery.toLocaleDateString(localeConfig.default, {
			weekday: "long",
			month: "long",
			day: "numeric",
		});
	});

	return (
		<div className="space-y-8">
			{/* Demo Banner */}
			<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
				<strong>演示模式：</strong> 这是一个模拟的订单确认。没有进行实际支付。
			</div>

			{/* Success Header */}
			<div className="space-y-4 text-center">
				<div className="flex justify-center">
					<div className="relative">
						<div className="absolute inset-0 animate-ping rounded-full bg-green-400/30" />
						<CheckCircle className="relative h-16 w-16 text-green-500" />
					</div>
				</div>
				<div>
					<p className="text-muted-foreground">订单 {orderNumber}</p>
					<h1 className="mt-1 text-2xl font-semibold">感谢您的订单！</h1>
				</div>
			</div>

			{/* Order Confirmation Card */}
			<div className="overflow-hidden rounded-lg border border-border">
				<div className="bg-secondary/50 border-b border-border p-4">
					<h2 className="font-semibold">您的订单已确认</h2>
					<p className="mt-1 break-words text-sm text-muted-foreground">您将收到一封确认邮件至 {email}</p>
				</div>

				{/* Order Details */}
				<div className="space-y-4 p-4">
					<div className="flex items-start gap-3">
						<Mail className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium">确认邮件已发送</p>
							<p className="break-words text-sm text-muted-foreground">{email}</p>
						</div>
					</div>
					{shippingAddress && (
						<div className="flex items-start gap-3">
							<MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
							<div className="min-w-0 flex-1">
								<p className="text-sm font-medium">配送地址</p>
								<p className="break-words text-sm text-muted-foreground">{formatAddress(shippingAddress)}</p>
							</div>
						</div>
					)}
					<div className="flex items-start gap-3">
						<Package className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium">预计送达</p>
							<p className="text-sm text-muted-foreground">{formattedDelivery}</p>
						</div>
					</div>
				</div>
			</div>

			{/* Actions */}
			<div className="flex flex-col gap-4 sm:flex-row">
				<Link
					href={`/${channel}`}
					className="inline-flex h-12 flex-1 items-center justify-center rounded-md border border-input bg-transparent px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
				>
					继续购物
				</Link>
			</div>
		</div>
	);
};
