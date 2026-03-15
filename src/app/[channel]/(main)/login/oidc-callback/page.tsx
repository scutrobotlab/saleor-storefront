"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { setExternalAuthTokens } from "@/lib/auth/external-auth";

const OIDC_PLUGIN_ID = "mirumee.authentication.openidconnect";
const SALEOR_API_URL = process.env.NEXT_PUBLIC_SALEOR_API_URL;

function ErrorSection({ message, channel }: { message: string; channel: string }) {
	return (
		<section className="mx-auto max-w-md p-8">
			<div className="rounded-lg border border-border bg-card p-6 text-center">
				<p className="text-destructive">{message}</p>
				<Link
					href={`/${channel}/login`}
					className="mt-4 inline-block text-sm font-medium underline underline-offset-2"
				>
					返回登录页
				</Link>
			</div>
		</section>
	);
}

export default function OidcCallbackPage() {
	const params = useParams<{ channel: string }>();
	const searchParams = useSearchParams();
	const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
	const [message, setMessage] = useState("");

	const code = searchParams.get("code");
	const state = searchParams.get("state");
	const channel = params.channel ?? "default-channel";

	// 提前校验放在渲染阶段，避免在 effect 内同步 setState 触发 react-hooks/set-state-in-effect
	const earlyError = !SALEOR_API_URL
		? "未配置 NEXT_PUBLIC_SALEOR_API_URL"
		: !code || !state
			? "缺少 code 或 state 参数"
			: null;

	useEffect(() => {
		if (earlyError !== null) return;
		const apiUrl = SALEOR_API_URL as string;

		async function exchangeToken() {
			try {
				const res = await fetch(apiUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						query: `
							mutation ExternalObtainAccessTokens($pluginId: String!, $input: JSONString!) {
								externalObtainAccessTokens(pluginId: $pluginId, input: $input) {
									token
									refreshToken
									csrfToken
									user { id email }
									accountErrors { code message field }
								}
							}
						`,
						variables: {
							pluginId: OIDC_PLUGIN_ID,
							input: JSON.stringify({ code, state }),
						},
					}),
				});

				const json = (await res.json()) as {
					data?: {
						externalObtainAccessTokens?: {
							token?: string | null;
							refreshToken?: string | null;
							refresh_token?: string | null;
							user?: { id: string; email: string } | null;
							accountErrors?: Array<{ message?: string | null }>;
							errors?: Array<{ message?: string | null }>;
						};
					};
					errors?: Array<{ message?: string }>;
				};

				// 兼容 mutation 结果的不同命名（camelCase / snake_case）
				const data = json.data as Record<string, unknown> | undefined;
				const payload = (data?.externalObtainAccessTokens ?? data?.external_obtain_access_tokens) as
					| Record<string, unknown>
					| null
					| undefined;
				const errs = (payload?.errors ?? payload?.accountErrors ?? json.errors) as
					| Array<{ message?: string | null }>
					| undefined;
				if (errs?.length) {
					setStatus("error");
					setMessage(errs[0]?.message ?? "登录失败");
					return;
				}

				// 兼容 camelCase / snake_case（Saleor 可能返回 snake_case）
				const token =
					(payload?.token as string | null | undefined) ??
					(payload?.access_token as string | null | undefined) ??
					null;
				const refreshToken =
					(payload?.refreshToken as string | null | undefined) ??
					(payload?.refresh_token as string | null | undefined) ??
					null;

				if (!token) {
					// 无 access token 时把接口返回的 errors 一并展示，便于排查
					const payloadErrs = (payload?.errors ?? payload?.accountErrors) as
						| Array<{ message?: string | null }>
						| undefined;
					const extra = payloadErrs?.length
						? payloadErrs
								.map((e) => e?.message)
								.filter(Boolean)
								.join("；") ?? ""
						: "";
					setStatus("error");
					setMessage(
						"未返回令牌。请确认：1) Dashboard 插件已启用且填全「OAuth 授权 URL / Token URL / JWKS URL」；2) Client Secret 已填写；3) IdP 回调地址与当前页一致。" +
							(extra ? ` 服务端信息：${extra}` : ""),
					);
					return;
				}

				// IdP 未返回 refresh_token 时仍可登录，仅 access token 有效期内保持会话（约 15 分钟）
				setExternalAuthTokens(apiUrl, token, refreshToken ?? "");
				setStatus("success");
				window.location.href = `/${channel}`;
			} catch (e) {
				setStatus("error");
				setMessage(e instanceof Error ? e.message : "请求失败");
			}
		}

		exchangeToken();
	}, [earlyError, channel, code, state]);

	if (earlyError !== null) {
		return <ErrorSection message={earlyError} channel={channel} />;
	}

	if (status === "loading") {
		return (
			<section className="mx-auto max-w-md p-8 text-center">
				<p className="text-muted-foreground">正在完成登录…</p>
			</section>
		);
	}

	if (status === "error") {
		return <ErrorSection message={message} channel={channel} />;
	}

	return null;
}
