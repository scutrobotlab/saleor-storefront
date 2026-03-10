"use client";

import { type FC, useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useSaleorAuthContext } from "@saleor/auth-sdk/react";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { useRequestPasswordResetMutation } from "@/checkout/graphql";

export interface SignInFormProps {
	/** Pre-filled email address */
	initialEmail?: string;
	/** Saleor channel slug for password reset */
	channelSlug: string;
	/** Called when sign-in is successful */
	onSuccess: () => void;
	/** Called when user wants to checkout as guest */
	onGuestCheckout: () => void;
}

/**
 * Sign-in form with email, password, and forgot password functionality.
 *
 * Features:
 * - Email/password authentication via Saleor
 * - Password visibility toggle
 * - Forgot password flow with rate limit messaging
 * - "Guest checkout" option
 */
export const SignInForm: FC<SignInFormProps> = ({
	initialEmail = "",
	channelSlug,
	onSuccess,
	onGuestCheckout,
}) => {
	const { signIn } = useSaleorAuthContext();
	const [, requestPasswordReset] = useRequestPasswordResetMutation();
	const [email, setEmail] = useState(initialEmail);
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const [passwordResetSent, setPasswordResetSent] = useState(false);

	const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccessMessage("");
		setIsSubmitting(true);

		try {
			const result = await signIn({ email, password });
			if (result.data?.tokenCreate?.errors?.length) {
				const err = result.data.tokenCreate.errors[0];
				setError(err.message || "电子邮件或密码无效");
			} else if (result.data?.tokenCreate?.token) {
				onSuccess();
			} else {
				setError("登录失败。请再试一次。");
			}
		} catch {
			setError("发生错误。请再试一次。");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleForgotPassword = async () => {
		setError("");
		setSuccessMessage("");

		if (!email) {
			setError("请先输入您的电子邮件地址");
			return;
		}

		if (!validateEmail(email)) {
			setError("请输入有效的电子邮件地址");
			return;
		}

		setIsSubmitting(true);
		try {
			const result = await requestPasswordReset({
				email,
				channel: channelSlug,
				redirectUrl: window.location.href,
			});

			if (result.error) {
				setError(result.error.message || "发送重置链接失败");
				return;
			}

			if (result.data?.requestPasswordReset?.errors?.length) {
				const err = result.data.requestPasswordReset.errors[0];
				setError(err.message || "发送重置链接失败");
			} else {
				setPasswordResetSent(true);
				setSuccessMessage(`如果 ${email} 存在账户，已发送密码重置链接。注意：每15分钟只能请求一个重置链接。`);
			}
		} catch {
			setError("发生错误。请再试一次。");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">登录</h2>
				<p className="text-sm text-muted-foreground">
					新客户？{" "}
					<button
						type="button"
						onClick={onGuestCheckout}
						className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
					>
						访客结账
					</button>
				</p>
			</div>

			{error && <div className="bg-destructive/10 rounded-md p-3 text-sm text-destructive">{error}</div>}

			{successMessage && (
				<div className="rounded-md bg-green-100 p-3 text-sm text-green-800">{successMessage}</div>
			)}

			<div className="space-y-1.5">
				<div className="relative">
					<Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="email"
						placeholder="电子邮件地址"
						value={email}
						onChange={(e) => {
							setEmail(e.target.value);
							setPasswordResetSent(false);
						}}
						autoComplete="email"
						className="h-12 pl-10"
						required
					/>
				</div>
			</div>

			<div className="space-y-1.5">
				<div className="relative">
					<Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type={showPassword ? "text" : "password"}
						placeholder="密码"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						autoComplete="current-password"
						className="h-12 pl-10 pr-10"
						required
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					>
						{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
					</button>
				</div>
			</div>

			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={handleForgotPassword}
					disabled={isSubmitting}
					className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground hover:no-underline disabled:opacity-50"
				>
					{passwordResetSent ? "重新发送链接？" : "忘记密码？"}
				</button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "处理中..." : "登录"}
				</Button>
			</div>
		</form>
	);
};
