"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useSaleorAuthContext } from "@saleor/auth-sdk/react";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALEOR_API_URL = process.env.NEXT_PUBLIC_SALEOR_API_URL;

interface ExternalAuth {
	id: string;
	name: string | null;
}

export function LoginMode() {
	const router = useRouter();
	const params = useParams<{ channel: string }>();
	const { signIn } = useSaleorAuthContext();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [resetMessage, setResetMessage] = useState("");
	const [resetEmailSent, setResetEmailSent] = useState(false);
	const [externalAuths, setExternalAuths] = useState<ExternalAuth[]>([]);
	const [oidcLoading, setOidcLoading] = useState<string | null>(null);

	// 拉取 Dashboard 配置的 OpenID Connect 等外部登录方式
	useEffect(() => {
		if (!SALEOR_API_URL) return;
		fetch(SALEOR_API_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				query: `query ShopExternalAuths { shop { availableExternalAuthentications { id name } } }`,
			}),
		})
			.then(
				(res) =>
					res.json() as Promise<{ data?: { shop?: { availableExternalAuthentications?: ExternalAuth[] } } }>,
			)
			.then((json) => {
				const list = json.data?.shop?.availableExternalAuthentications ?? [];
				setExternalAuths(list);
			})
			.catch(() => {});
	}, []);

	const handleExternalLogin = async (pluginId: string) => {
		if (!SALEOR_API_URL || !params.channel) return;
		setOidcLoading(pluginId);
		setError("");
		const redirectUri = `${typeof window !== "undefined" ? window.location.origin : ""}/${
			params.channel
		}/login/oidc-callback`;
		try {
			const res = await fetch(SALEOR_API_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					query: `mutation ExternalAuthenticationUrl($pluginId: String!, $input: JSONString!) {
						externalAuthenticationUrl(pluginId: $pluginId, input: $input) {
							authenticationData
							accountErrors { code message field }
						}
					}`,
					variables: {
						pluginId,
						input: JSON.stringify({ redirectUri }),
					},
				}),
			});
			const json = (await res.json()) as {
				data?: {
					externalAuthenticationUrl?: {
						authenticationData?: string | null;
						accountErrors: Array<{ message?: string | null }>;
					};
				};
			};
			const errs = json.data?.externalAuthenticationUrl?.accountErrors;
			if (errs?.length) {
				setError(errs[0]?.message ?? "获取登录地址失败");
				return;
			}
			const raw = json.data?.externalAuthenticationUrl?.authenticationData;
			const data = raw ? (JSON.parse(raw) as { authorizationUrl?: string }) : null;
			const url = data?.authorizationUrl;
			if (url) {
				window.location.href = url;
			} else {
				setError("未返回登录地址");
			}
		} catch {
			setError("请求失败");
		} finally {
			setOidcLoading(null);
		}
	};

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (!email || !EMAIL_RE.test(email)) {
			setError("请输入有效的电子邮件地址");
			return;
		}

		if (!password) {
			setError("请输入您的密码");
			return;
		}

		setIsSubmitting(true);

		try {
			const result = await signIn({ email, password });

			if (result.data?.tokenCreate?.errors?.length) {
				const err = result.data.tokenCreate.errors[0];
				const isInvalidCredentials =
					err.message?.toLowerCase().includes("invalid") ||
					err.message?.toLowerCase().includes("credentials");
				setError(isInvalidCredentials ? "无效的电子邮件或密码。请重试。" : err.message || "登录失败");
				return;
			}

			if (result.data?.tokenCreate?.token) {
				router.push(`/${params.channel}`);
				router.refresh();
			}
		} catch {
			setError("发生错误。请重试。");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleForgotPassword = async () => {
		setError("");
		setResetMessage("");

		if (!email || !EMAIL_RE.test(email)) {
			setError("请先输入有效的电子邮件地址");
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email,
					channel: params.channel,
					redirectUrl: `${window.location.origin}/${params.channel}/login`,
				}),
			});

			const data = (await response.json()) as {
				errors?: Array<{ message: string }>;
				success?: boolean;
			};

			if (data.errors?.length) {
				setError(data.errors[0].message || "发送重置链接失败");
				return;
			}

			setResetEmailSent(true);
			setResetMessage(
				`如果 ${email} 存在账户，则已发送密码重置链接。请注意：您每 15 分钟只能请求一个重置链接。`,
			);
		} catch {
			setError("发生错误。请重试。");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="mx-auto my-16 w-full max-w-md">
			<div className="rounded-lg border border-border bg-card p-8 shadow-sm">
				<div className="mb-6 text-center">
					<h1 className="text-2xl font-semibold">欢迎回来</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						还没有账户？{" "}
						<Link
							href={`/${params.channel}/signup`}
							className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
						>
							注册
						</Link>
					</p>
				</div>

				<form onSubmit={handleLogin} className="space-y-4">
					{error && (
						<div role="alert" className="bg-destructive/10 rounded-md p-3 text-sm text-destructive">
							{error}
						</div>
					)}

					{resetMessage && (
						<div aria-live="polite" className="rounded-md bg-green-100 p-3 text-sm text-green-800">
							{resetMessage}
						</div>
					)}

					<div className="space-y-1.5">
						<Label htmlFor="email" className="text-sm font-medium">
							电子邮件地址
						</Label>
						<div className="relative">
							<Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								autoComplete="email"
								spellCheck={false}
								value={email}
								onChange={(e) => {
									setEmail(e.target.value);
									setResetEmailSent(false);
								}}
								className="h-12 pl-10"
								required
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="password" className="text-sm font-medium">
							密码
						</Label>
						<div className="relative">
							<Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="password"
								type={showPassword ? "text" : "password"}
								placeholder="输入您的密码"
								autoComplete="current-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="h-12 pl-10 pr-10"
								required
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								aria-label={showPassword ? "隐藏密码" : "显示密码"}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
					</div>

					<div className="flex justify-end">
						<button
							type="button"
							onClick={handleForgotPassword}
							disabled={isSubmitting}
							className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground hover:no-underline disabled:opacity-50"
						>
							{resetEmailSent ? "重新发送链接？" : "忘记密码？"}
						</button>
					</div>

					<Button type="submit" disabled={isSubmitting} className="h-12 w-full text-base font-semibold">
						{isSubmitting ? "登录中…" : "登录"}
					</Button>

					{externalAuths.length > 0 && (
						<>
							<div className="relative my-6">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t border-border" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-card px-2 text-muted-foreground">或</span>
								</div>
							</div>
							<div className="space-y-2">
								{externalAuths.map((auth) => (
									<Button
										key={auth.id}
										type="button"
										variant="outline-solid"
										className="h-12 w-full text-base font-medium"
										disabled={!!oidcLoading}
										onClick={() => handleExternalLogin(auth.id)}
									>
										{oidcLoading === auth.id ? "跳转中…" : `使用 ${auth.name ?? "第三方"} 登录`}
									</Button>
								))}
							</div>
						</>
					)}
				</form>
			</div>
		</div>
	);
}
