"use client";

import { useEffect, useRef, useState, type FC } from "react";
import { Loader2, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { useTransactionProcessMutation } from "@/checkout/graphql";

export interface WechatPaymentData {
	mode: "qrcode" | "h5";
	/** For QR code: the weixin:// URI or URL to render as QR */
	qrcodeUrl?: string;
	/** For H5: the payurl2 link to redirect to */
	redirectUrl?: string;
	O_id?: string;
	outTradeNo?: string;
}

interface WechatPaymentProps {
	transactionId: string;
	data: WechatPaymentData;
	/** Called when Saleor confirms payment and the order has been created */
	onSuccess: (orderId: string) => void;
	onError: (message: string) => void;
}

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_ATTEMPTS = 100; // 5 minutes

/**
 * Handles WeChat payment UI after transactionInitialize returns CHARGE_ACTION_REQUIRED.
 *
 * PC flow:   renders an inline QR code + starts polling transactionProcess every 3 s.
 * Mobile flow: redirects to WeChat H5 immediately; polling handled by return_url page.
 */
export const WechatPayment: FC<WechatPaymentProps> = ({ transactionId, data, onSuccess, onError }) => {
	const [, transactionProcess] = useTransactionProcessMutation();
	const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
	const [status, setStatus] = useState<"waiting" | "polling" | "redirecting" | "error">("waiting");
	const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const attemptRef = useRef(0);

	// ── QR code generation (PC) ─────────────────────────────────────────────────
	useEffect(() => {
		if (data.mode !== "qrcode" || !data.qrcodeUrl) return;

		// Use the free QR server API to generate a QR image from the URL/content
		const encoded = encodeURIComponent(data.qrcodeUrl);
		setQrImageUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`);
	}, [data.mode, data.qrcodeUrl]);

	// ── Mobile H5 redirect ──────────────────────────────────────────────────────
	useEffect(() => {
		if (data.mode !== "h5" || !data.redirectUrl) return;
		setStatus("redirecting");
		window.location.href = data.redirectUrl;
	}, [data.mode, data.redirectUrl]);

	// ── PC polling ──────────────────────────────────────────────────────────────
	const poll = async () => {
		if (attemptRef.current >= MAX_POLL_ATTEMPTS) {
			setStatus("error");
			onError("支付超时，请刷新页面重试。");
			return;
		}
		attemptRef.current += 1;

		const result = await transactionProcess({ id: transactionId });
		const event = result.data?.transactionProcess?.transactionEvent;

		if (event?.type === "CHARGE_SUCCESS") {
			// Payment confirmed — storefront needs to call checkoutComplete to get the order.
			// For the App router flow, fire checkoutComplete from here via the parent.
			onSuccess(transactionId);
			return;
		}

		if (event?.type === "CHARGE_FAILURE") {
			setStatus("error");
			onError(event.message ?? "支付失败，请重试。");
			return;
		}

		// Still CHARGE_ACTION_REQUIRED — schedule next poll
		pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
	};

	useEffect(() => {
		if (data.mode !== "qrcode") return;
		setStatus("polling");
		pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);

		return () => {
			if (pollRef.current) clearTimeout(pollRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [transactionId, data.mode]);

	// ── Render ──────────────────────────────────────────────────────────────────

	if (data.mode === "h5") {
		return (
			<div className="flex flex-col items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
				<Smartphone className="h-10 w-10 text-green-600" />
				<div>
					<p className="font-semibold text-green-800">正在跳转微信支付...</p>
					<p className="mt-1 text-sm text-green-700">如果未自动跳转，请点击下方按钮。</p>
				</div>
				<Button
					variant="outline-solid"
					size="sm"
					onClick={() => {
						if (data.redirectUrl) window.location.href = data.redirectUrl;
					}}
				>
					打开微信支付
				</Button>
			</div>
		);
	}

	// PC QR code
	return (
		<div className="flex flex-col items-center gap-4 rounded-lg border p-6 text-center">
			<svg
				viewBox="0 0 1024 1024"
				xmlns="http://www.w3.org/2000/svg"
				className="h-12 w-auto"
				aria-label="微信支付"
			>
				<path
					d="M404.511405 600.865957c-4.042059 2.043542-8.602935 3.223415-13.447267 3.223415-11.197016 0-20.934798-6.169513-26.045189-15.278985l-1.959631-4.296863-81.56569-178.973184c-0.880043-1.954515-1.430582-4.14746-1.430582-6.285147 0-8.251941 6.686283-14.944364 14.938224-14.944364 3.351328 0 6.441713 1.108241 8.94165 2.966565l96.242971 68.521606c7.037277 4.609994 15.433504 7.305383 24.464181 7.305383 5.40101 0 10.533914-1.00284 15.328104-2.75167l452.645171-201.459315C811.496653 163.274644 677.866167 100.777241 526.648117 100.777241c-247.448742 0-448.035176 167.158091-448.035176 373.361453 0 112.511493 60.353576 213.775828 154.808832 282.214547 7.582699 5.405103 12.537548 14.292518 12.537548 24.325012 0 3.312442-0.712221 6.358825-1.569752 9.515724-7.544837 28.15013-19.62599 73.202209-20.188808 75.314313-0.940418 3.529383-2.416026 7.220449-2.416026 10.917654 0 8.245801 6.692423 14.933107 14.944364 14.933107 3.251044 0 5.89015-1.202385 8.629541-2.7793l98.085946-56.621579c7.377014-4.266164 15.188934-6.89913 23.790846-6.89913 4.577249 0 9.003048 0.703011 13.174044 1.978051 45.75509 13.159718 95.123474 20.476357 146.239666 20.476357 247.438509 0 448.042339-167.162184 448.042339-373.372709 0-62.451354-18.502399-121.275087-51.033303-173.009356L407.778822 598.977957 404.511405 600.865957z"
					fill="#00C800"
				/>
			</svg>
			<p className="font-semibold">请使用微信扫码支付</p>

			{qrImageUrl ? (
				<div className="relative">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={qrImageUrl} alt="微信支付二维码" width={200} height={200} className="rounded-lg border" />
					{status === "polling" && (
						<div className="absolute inset-0 flex items-end justify-center pb-2">
							<span className="flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
								<Loader2 className="h-3 w-3 animate-spin" />
								等待支付...
							</span>
						</div>
					)}
				</div>
			) : (
				<div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border bg-muted">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			)}

			<p className="text-sm text-muted-foreground">二维码有效期 5 分钟 · 扫码后本页将自动跳转</p>

			{status === "error" && (
				<Button
					variant="outline-solid"
					size="sm"
					onClick={() => {
						attemptRef.current = 0;
						setStatus("polling");
						pollRef.current = setTimeout(poll, 500);
					}}
					className="gap-2"
				>
					<RefreshCw className="h-4 w-4" />
					重新检查支付状态
				</Button>
			)}
		</div>
	);
};
