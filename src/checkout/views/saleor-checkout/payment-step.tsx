"use client";

import { useState, useEffect, useCallback, type FC } from "react";
import { ChevronLeft, AlertCircle, Smartphone, Monitor } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/ui/components/ui/button";
import { CheckoutSummaryContext, buildPaymentSummaryRows } from "./checkout-summary-context";
import {
	type CheckoutFragment,
	type CountryCode,
	type AddressFragment,
	useCheckoutBillingAddressUpdateMutation,
	useTransactionInitializeMutation,
	useCheckoutCompleteMutation,
} from "@/checkout/graphql";
import { useCheckout } from "@/checkout/hooks/use-checkout";
import { useUser } from "@/checkout/hooks/use-user";
import { getAddressInputData } from "@/checkout/components/address-form/utils";
import { createQueryString } from "@/checkout/lib/utils/url";
import { localeConfig } from "@/config/locale";
import { MobileStickyAction } from "./mobile-sticky-action";
import { getStepNumber } from "./flow";

// Extracted reusable components
import { BillingAddressSection, type BillingAddressData } from "@/checkout/components/payment";
import { WechatPayment, type WechatPaymentData } from "@/checkout/components/payment/wechat-payment";
import { LoadingSpinner } from "@/checkout/ui-kit/loading-spinner";
import { formatMoneyWithFallback } from "@/checkout/lib/utils/money";

/** Z-Pay App ID registered in Saleor */
const ZPAY_GATEWAY_ID = "saleor-payment-zpay";
/** Fallback test gateway */
const DUMMY_GATEWAY_ID = "mirumee.payments.dummy";

interface PaymentStepProps {
	checkout: CheckoutFragment;
	onBack: () => void;
	/** @deprecated Not used; payment completion now redirects via orderId query param */
	onComplete?: () => void;
	onGoToInformation?: () => void;
}

export const PaymentStep: FC<PaymentStepProps> = ({
	checkout: initialCheckout,
	onBack,
	onGoToInformation,
}) => {
	const router = useRouter();
	const searchParams = useSearchParams();
	// Use live checkout data to ensure we have the latest total (including shipping)
	const { checkout: liveCheckout } = useCheckout();
	const checkout = liveCheckout || initialCheckout;

	// Get user data for saved addresses
	const { user, authenticated } = useUser();

	// For digital products, there's no shipping address, so can't use "same as billing"
	const isShippingRequired = checkout.isShippingRequired;
	const hasShippingAddress = !!checkout.shippingAddress;

	// WeChat payment state (set after transactionInitialize succeeds)
	const [wechatData, setWechatData] = useState<{
		transactionId: string;
		payData: WechatPaymentData;
	} | null>(null);

	// Billing address state
	const [sameAsBilling, setSameAsBilling] = useState(isShippingRequired && hasShippingAddress);
	// Lazy initialization - complex object only created once on mount
	const [billingData, setBillingData] = useState<BillingAddressData>(() => ({
		countryCode: (checkout.billingAddress?.country?.code as CountryCode) || "US",
		formData: {
			firstName: checkout.billingAddress?.firstName || "",
			lastName: checkout.billingAddress?.lastName || "",
			streetAddress1: checkout.billingAddress?.streetAddress1 || "",
			streetAddress2: checkout.billingAddress?.streetAddress2 || "",
			companyName: checkout.billingAddress?.companyName || "",
			city: checkout.billingAddress?.city || "",
			postalCode: checkout.billingAddress?.postalCode || "",
			countryArea: checkout.billingAddress?.countryArea || "",
			phone: checkout.billingAddress?.phone || "",
		},
	}));

	// Sync billing address from server state
	useEffect(() => {
		const billing = checkout.billingAddress;
		if (billing) {
			setBillingData((prev) => ({
				...prev,
				countryCode: (billing.country?.code as CountryCode) || "US",
				formData: {
					firstName: billing.firstName || "",
					lastName: billing.lastName || "",
					streetAddress1: billing.streetAddress1 || "",
					streetAddress2: billing.streetAddress2 || "",
					companyName: billing.companyName || "",
					city: billing.city || "",
					postalCode: billing.postalCode || "",
					countryArea: billing.countryArea || "",
					cityArea: billing.cityArea || "",
					phone: billing.phone || "",
				},
			}));
		}
	}, [checkout.billingAddress]);

	const [isProcessing, setIsProcessing] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Mutations
	const [, updateBillingAddress] = useCheckoutBillingAddressUpdateMutation();
	const [transactionState, transactionInitialize] = useTransactionInitializeMutation();
	const [completeState, checkoutComplete] = useCheckoutCompleteMutation();

	// Check for available payment gateways
	const availableGateways = checkout.availablePaymentGateways || [];
	const hasZpayGateway = availableGateways.some((g) => g.id === ZPAY_GATEWAY_ID);
	const hasDummyGateway = availableGateways.some((g) => g.id === DUMMY_GATEWAY_ID);
	const hasAnyGateway = hasZpayGateway || hasDummyGateway;

	/** Detect mobile browser for H5 vs QR code decision */
	const isMobile =
		typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

	const shippingAddress = checkout.shippingAddress;

	// Memoize billing data handler to avoid infinite loops
	const handleBillingDataChange = useCallback((data: BillingAddressData) => {
		setBillingData(data);
	}, []);

	// Summary rows for context display
	const summaryRows = buildPaymentSummaryRows(checkout);

	// Handle step navigation from summary
	const handleGoToStep = (step: number) => {
		if (step === 1 && onGoToInformation) {
			onGoToInformation();
		} else if (step === 2) {
			onBack();
		}
	};

	const total = checkout.totalPrice?.gross;
	const totalStr = formatMoneyWithFallback(total);

	/** After Z-Pay (or dummy) payment is confirmed, complete the checkout to get the order */
	const handlePaymentConfirmed = useCallback(async () => {
		setIsProcessing(true);
		try {
			const completeResult = await checkoutComplete({ checkoutId: checkout.id });
			if (completeResult.error) {
				setErrors({ payment: "创建订单失败，请重试。" });
				return;
			}
			const completeErrors = completeResult.data?.checkoutComplete?.errors;
			if (completeErrors?.length) {
				setErrors({ payment: completeErrors[0].message ?? "创建订单失败" });
				return;
			}
			const order = completeResult.data?.checkoutComplete?.order;
			if (order) {
				const newQuery = createQueryString(searchParams, { orderId: order.id });
				router.replace(`?${newQuery}`, { scroll: false });
			}
		} finally {
			setIsProcessing(false);
		}
	}, [checkout.id, checkoutComplete, searchParams, router]);

	const handleSubmit = useCallback(
		async (event?: React.FormEvent) => {
			if (event) event.preventDefault();
			setErrors({});

			const needsBillingForm = !sameAsBilling || !hasShippingAddress;
			setIsProcessing(true);

			try {
				// ── Step 1: Update billing address ────────────────────────────────────
				if (needsBillingForm) {
					let addressInput;
					if (billingData.selectedAddressId && user?.addresses) {
						const selectedAddress = user.addresses.find((addr) => addr.id === billingData.selectedAddressId);
						if (selectedAddress) {
							addressInput = getAddressInputData({
								firstName: selectedAddress.firstName || "",
								lastName: selectedAddress.lastName || "",
								streetAddress1: selectedAddress.streetAddress1 || "",
								streetAddress2: selectedAddress.streetAddress2 || "",
								companyName: selectedAddress.companyName || "",
								city: selectedAddress.city || "",
								postalCode: selectedAddress.postalCode || "",
								countryArea: selectedAddress.countryArea || "",
								phone: selectedAddress.phone || "",
								countryCode: selectedAddress.country?.code as CountryCode,
							});
						}
					}
					if (!addressInput) {
						addressInput = getAddressInputData({
							...billingData.formData,
							countryCode: billingData.countryCode,
						});
					}
					const result = await updateBillingAddress({
						checkoutId: checkout.id,
						billingAddress: addressInput,
						languageCode: localeConfig.graphqlLanguageCode,
					});
					if (result.error) {
						setErrors({ streetAddress1: "更新账单地址失败" });
						return;
					}
					const billingErrors = result.data?.checkoutBillingAddressUpdate?.errors;
					if (billingErrors?.length) {
						const errorMap: Record<string, string> = {};
						billingErrors.forEach((err) => {
							const field = err.field || "streetAddress1";
							errorMap[field] = err.message || "无效值";
						});
						setErrors(errorMap);
						document.querySelector<HTMLElement>(`[name="${Object.keys(errorMap)[0]}"]`)?.focus();
						return;
					}
				} else if (shippingAddress) {
					const addressInput = getAddressInputData({
						firstName: shippingAddress.firstName || "",
						lastName: shippingAddress.lastName || "",
						streetAddress1: shippingAddress.streetAddress1 || "",
						streetAddress2: shippingAddress.streetAddress2 || "",
						companyName: shippingAddress.companyName || "",
						city: shippingAddress.city || "",
						postalCode: shippingAddress.postalCode || "",
						countryArea: shippingAddress.countryArea || "",
						phone: shippingAddress.phone || "",
						countryCode: shippingAddress.country?.code as CountryCode,
					});
					await updateBillingAddress({
						checkoutId: checkout.id,
						billingAddress: addressInput,
						languageCode: localeConfig.graphqlLanguageCode,
					});
				}

				// ── Step 2: Initialize payment ────────────────────────────────────────
				if (!hasAnyGateway) {
					setErrors({ payment: "未配置支付网关，请联系客服。" });
					return;
				}

				if (hasZpayGateway) {
					// WeChat Pay via Z-Pay App
					const initResult = await transactionInitialize({
						checkoutId: checkout.id,
						paymentGateway: {
							id: ZPAY_GATEWAY_ID,
							data: {
								device: isMobile ? "mobile" : "pc",
								clientIp: "unknown",
							},
						},
					});

					if (initResult.error || initResult.data?.transactionInitialize?.errors?.length) {
						const msg = initResult.data?.transactionInitialize?.errors?.[0]?.message ?? "支付初始化失败";
						setErrors({ payment: msg });
						return;
					}

					const txData = initResult.data?.transactionInitialize;
					const txId = txData?.transaction?.id;
					const eventType = txData?.transactionEvent?.type;
					const payData = txData?.data as WechatPaymentData | null;

					if (eventType === "CHARGE_ACTION_REQUIRED" && txId && payData) {
						// Show QR / redirect to H5 — payment not yet complete
						setWechatData({ transactionId: txId, payData });
						return;
					}

					if (eventType === "CHARGE_SUCCESS") {
						await handlePaymentConfirmed();
						return;
					}

					setErrors({ payment: txData?.transactionEvent?.message ?? "支付失败" });
					return;
				}

				if (hasDummyGateway) {
					// Test / development path
					const initResult = await transactionInitialize({
						checkoutId: checkout.id,
						paymentGateway: {
							id: DUMMY_GATEWAY_ID,
							data: { event: { includePspReference: true, type: "CHARGE_SUCCESS" } },
						},
					});

					if (initResult.error || initResult.data?.transactionInitialize?.errors?.length) {
						setErrors({ payment: "支付失败，请重试。" });
						return;
					}

					await handlePaymentConfirmed();
					return;
				}
			} finally {
				setIsProcessing(false);
			}
		},
		[
			sameAsBilling,
			hasShippingAddress,
			billingData,
			user?.addresses,
			shippingAddress,
			checkout.id,
			hasZpayGateway,
			hasDummyGateway,
			hasAnyGateway,
			isMobile,
			updateBillingAddress,
			transactionInitialize,
			handlePaymentConfirmed,
			searchParams,
			router,
		],
	);

	const isPaymentProcessing = transactionState.fetching || completeState.fetching;
	const isLoading = isProcessing || isPaymentProcessing;

	const buttonText = isLoading
		? completeState.fetching
			? "正在创建订单..."
			: "正在处理支付..."
		: `微信支付 ${totalStr}`;

	const isDisabled = isLoading || !hasAnyGateway;

	// ── WeChat payment pending (QR code or H5 redirect initiated) ───────────────
	if (wechatData) {
		return (
			<div className="space-y-6">
				<CheckoutSummaryContext checkout={checkout} rows={summaryRows} onGoToStep={handleGoToStep} />
				<WechatPayment
					transactionId={wechatData.transactionId}
					data={wechatData.payData}
					onSuccess={handlePaymentConfirmed}
					onError={(msg) => {
						setWechatData(null);
						setErrors({ payment: msg });
					}}
				/>
				{isProcessing && (
					<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
						<LoadingSpinner />
						正在创建订单...
					</div>
				)}
				<button
					type="button"
					onClick={() => setWechatData(null)}
					className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					<ChevronLeft className="h-4 w-4" />
					重新选择支付方式
				</button>
			</div>
		);
	}

	return (
		<form className="space-y-8" onSubmit={handleSubmit}>
			{/* Summary Context */}
			<CheckoutSummaryContext checkout={checkout} rows={summaryRows} onGoToStep={handleGoToStep} />

			{/* No Payment Gateway Warning */}
			{!hasAnyGateway && (
				<div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
					<AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
					<div>
						<p className="font-medium text-amber-800">未配置支付网关</p>
						<p className="mt-1 text-sm text-amber-700">请在 Saleor 后台安装 Z-Pay 微信支付应用后刷新页面。</p>
					</div>
				</div>
			)}

			{/* Test Mode Indicator */}
			{hasDummyGateway && !hasZpayGateway && (
				<div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
					<AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
					<div>
						<p className="font-medium text-blue-800">测试模式</p>
						<p className="mt-1 text-sm text-blue-700">正在使用测试支付网关，不会产生实际费用。</p>
					</div>
				</div>
			)}

			{/* WeChat Pay method card */}
			{hasZpayGateway && (
				<section className="space-y-3">
					<h2 className="text-lg font-semibold">支付方式</h2>
					<div className="rounded-lg border border-green-300 bg-green-50 p-4">
						<div className="flex items-center gap-3">
							{/* WeChat Pay icon (inline SVG — no external file dependency) */}
							<svg
								viewBox="0 0 1024 1024"
								xmlns="http://www.w3.org/2000/svg"
								className="h-10 w-auto shrink-0"
								aria-label="微信支付"
							>
								<path
									d="M404.511405 600.865957c-4.042059 2.043542-8.602935 3.223415-13.447267 3.223415-11.197016 0-20.934798-6.169513-26.045189-15.278985l-1.959631-4.296863-81.56569-178.973184c-0.880043-1.954515-1.430582-4.14746-1.430582-6.285147 0-8.251941 6.686283-14.944364 14.938224-14.944364 3.351328 0 6.441713 1.108241 8.94165 2.966565l96.242971 68.521606c7.037277 4.609994 15.433504 7.305383 24.464181 7.305383 5.40101 0 10.533914-1.00284 15.328104-2.75167l452.645171-201.459315C811.496653 163.274644 677.866167 100.777241 526.648117 100.777241c-247.448742 0-448.035176 167.158091-448.035176 373.361453 0 112.511493 60.353576 213.775828 154.808832 282.214547 7.582699 5.405103 12.537548 14.292518 12.537548 24.325012 0 3.312442-0.712221 6.358825-1.569752 9.515724-7.544837 28.15013-19.62599 73.202209-20.188808 75.314313-0.940418 3.529383-2.416026 7.220449-2.416026 10.917654 0 8.245801 6.692423 14.933107 14.944364 14.933107 3.251044 0 5.89015-1.202385 8.629541-2.7793l98.085946-56.621579c7.377014-4.266164 15.188934-6.89913 23.790846-6.89913 4.577249 0 9.003048 0.703011 13.174044 1.978051 45.75509 13.159718 95.123474 20.476357 146.239666 20.476357 247.438509 0 448.042339-167.162184 448.042339-373.372709 0-62.451354-18.502399-121.275087-51.033303-173.009356L407.778822 598.977957 404.511405 600.865957z"
									fill="#00C800"
								/>
							</svg>
							<div className="flex-1">
								<p className="font-semibold text-green-900">微信支付</p>
								<p className="text-sm text-green-700">
									{isMobile ? "点击下方按钮，自动跳转微信完成支付" : "点击下方按钮，扫描二维码完成支付"}
								</p>
							</div>
							{isMobile ? (
								<Smartphone className="h-5 w-5 text-green-600" />
							) : (
								<Monitor className="h-5 w-5 text-green-600" />
							)}
						</div>
					</div>
				</section>
			)}

			{/* Billing Address */}
			<BillingAddressSection
				billingAddress={checkout.billingAddress}
				shippingAddress={shippingAddress}
				userAddresses={authenticated ? (user?.addresses as AddressFragment[]) : undefined}
				defaultBillingAddressId={user?.defaultBillingAddress?.id}
				isShippingRequired={isShippingRequired}
				errors={errors}
				onChange={handleBillingDataChange}
				onSameAsShippingChange={setSameAsBilling}
				initialSameAsShipping={sameAsBilling}
			/>

			{/* Error Display */}
			{errors.payment && (
				<div className="border-destructive/50 bg-destructive/10 flex items-start gap-3 rounded-lg border p-4">
					<AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
					<div>
						<p className="font-medium text-destructive">支付失败</p>
						<p className="text-destructive/80 text-sm">{errors.payment}</p>
					</div>
				</div>
			)}

			{/* Navigation */}
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={onBack}
					className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					<ChevronLeft className="h-4 w-4" />
					{isShippingRequired ? "返回配送" : "返回信息"}
				</button>
				<Button type="submit" disabled={isDisabled} className="hidden h-12 min-w-[200px] px-8 md:flex">
					{isLoading ? (
						<span className="flex items-center gap-2">
							<LoadingSpinner />
							{buttonText}
						</span>
					) : (
						buttonText
					)}
				</Button>
			</div>

			<MobileStickyAction
				step={getStepNumber("PAYMENT", isShippingRequired)}
				isShippingRequired={isShippingRequired}
				type="submit"
				onAction={handleSubmit}
				isLoading={isLoading}
				disabled={isDisabled}
				total={totalStr}
				loadingText={completeState.fetching ? "正在创建订单..." : "正在处理支付..."}
			/>
		</form>
	);
};
