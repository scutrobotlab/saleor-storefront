"use client";

import Link from "next/link";
import { Search, Home, ArrowLeft } from "lucide-react";

/**
 * Product not found page.
 *
 * Shown when a product slug doesn't exist or has been removed.
 * Provides helpful navigation options.
 */
export default function ProductNotFound() {
	const buttonBase =
		"inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

	return (
		<div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16">
			<div className="mx-auto max-w-md text-center">
				{/* 404 Badge */}
				<span className="mb-4 inline-block rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
					404
				</span>

				{/* Heading */}
				<h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">未找到商品</h1>

				{/* Message */}
				<p className="mb-8 text-muted-foreground">该商品可能已被删除、重命名或暂时无法购买。</p>

				{/* Actions */}
				<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Link
						href="/products"
						className={`${buttonBase} hover:bg-primary/90 bg-primary text-primary-foreground`}
					>
						<Search className="h-4 w-4" />
						浏览商品
					</Link>

					<Link
						href="/"
						className={`${buttonBase} border border-input bg-background hover:bg-accent hover:text-accent-foreground`}
					>
						<Home className="h-4 w-4" />
						返回首页
					</Link>
				</div>

				{/* Back link */}
				<Link
					href="#"
					onClick={(e) => {
						e.preventDefault();
						window.history.back();
					}}
					className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-3 w-3" />
					返回
				</Link>
			</div>
		</div>
	);
}
