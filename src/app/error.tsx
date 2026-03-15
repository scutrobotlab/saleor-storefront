"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { type SaleorError } from "@/lib/graphql";

interface ErrorPageProps {
	error: Error & { digest?: string };
	reset: () => void;
}

/** 判断是否为登录态过期/未授权（401/403 或相关文案），应跳转登录而非展示错误页 */
function isAuthExpiredError(error: Error & { statusCode?: number }): boolean {
	const code = (error as { statusCode?: number }).statusCode;
	if (code === 401 || code === 403) return true;
	const msg = (error?.message ?? "").toLowerCase();
	return (
		/unauthorized|permission denied|token|expired|认证|登录|权限|invalid.*auth/i.test(msg) ||
		msg.includes("401") ||
		msg.includes("403")
	);
}

/** 从当前 pathname 解析 channel（如 /channel-cny/account -> channel-cny） */
function getChannelFromPathname(): string {
	if (typeof window === "undefined") return "default-channel";
	const segments = window.location.pathname.split("/").filter(Boolean);
	return segments[0] ?? "default-channel";
}

/**
 * Global error page for uncaught errors.
 *
 * 登录态过期时自动跳转登录页，不展示「发生错误」。
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
	const saleorError = error as SaleorError & { statusCode?: number };
	const isAuthExpired = isAuthExpiredError(saleorError);

	// 登录态过期：静默跳转登录页，不显示错误内容
	useEffect(() => {
		console.error("[Error Page]", error);
		if (isAuthExpired) {
			const channel = getChannelFromPathname();
			window.location.replace(`/${channel}/login`);
		}
	}, [error, isAuthExpired]);

	if (isAuthExpired) {
		return (
			<div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16">
				<p className="text-muted-foreground">登录已过期，正在跳转到登录页…</p>
			</div>
		);
	}

	// Extract error info
	const isRetryable = saleorError.isRetryable ?? true;
	const userMessage = saleorError.userMessage ?? "加载此页面时出现问题。";
	const errorType = saleorError.type ?? "unknown";

	const buttonBase =
		"inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring";

	return (
		<div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16">
			<div className="mx-auto max-w-md text-center">
				{/* Icon */}
				<div className="bg-destructive/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
					<AlertCircle className="h-8 w-8 text-destructive" />
				</div>

				{/* Heading */}
				<h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
					{errorType === "network" ? "连接错误" : "发生错误"}
				</h1>

				{/* Message */}
				<p className="mb-8 text-muted-foreground">{userMessage}</p>

				{/* Actions */}
				<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
					{isRetryable && (
						<button
							onClick={reset}
							className={`${buttonBase} hover:bg-primary/90 bg-primary text-primary-foreground`}
						>
							<RefreshCw className="h-4 w-4" />
							重试
						</button>
					)}

					<Link
						href="/"
						className={`${buttonBase} ${
							isRetryable
								? "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
								: "hover:bg-primary/90 bg-primary text-primary-foreground"
						}`}
					>
						<Home className="h-4 w-4" />
						返回主页
					</Link>
				</div>

				{/* Back link */}
				<button
					onClick={() => window.history.back()}
					className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-3 w-3" />
					返回
				</button>

				{/* Error digest for support (production only) */}
				{error.digest && <p className="text-muted-foreground/60 mt-8 text-xs">错误 ID：{error.digest}</p>}
			</div>
		</div>
	);
}
