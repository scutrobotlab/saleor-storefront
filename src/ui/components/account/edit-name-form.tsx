"use client";

import { useState, useTransition, useCallback } from "react";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { updateProfile } from "@/app/[channel]/(main)/account/actions";

type Props = {
	firstName: string;
	lastName: string;
};

export function EditNameForm({ firstName, lastName }: Props) {
	const [isEditing, setIsEditing] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);

	const handleSubmit = useCallback(
		(formData: FormData) => {
			setError("");
			setSuccess(false);

			startTransition(async () => {
				const result = await updateProfile(formData);
				if (!result.success) {
					setError(result.error);
				} else {
					setSuccess(true);
					setIsEditing(false);
				}
			});
		},
		[startTransition],
	);

	if (!isEditing) {
		return (
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm text-muted-foreground">姓名</p>
					<p className="font-medium">{firstName || lastName ? `${lastName}${firstName}`.trim() : "未设置"}</p>
				</div>
				<div className="flex items-center gap-2">
					{success && (
						<span aria-live="polite" className="text-sm text-green-600">
							已更新
						</span>
					)}
					<Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
						编辑
					</Button>
				</div>
			</div>
		);
	}

	return (
		<form action={handleSubmit} className="space-y-4">
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			{/* 中国习惯：先姓后名 */}
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor="lastName">姓</Label>
					<Input
						id="lastName"
						name="lastName"
						autoComplete="family-name"
						defaultValue={lastName}
						placeholder="姓"
						required
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="firstName">名</Label>
					<Input
						id="firstName"
						name="firstName"
						autoComplete="given-name"
						defaultValue={firstName}
						placeholder="名"
						required
					/>
				</div>
			</div>
			<div className="flex gap-2">
				<Button type="submit" size="sm" disabled={isPending}>
					{isPending ? "正在保存…" : "保存"}
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => {
						setIsEditing(false);
						setError("");
					}}
				>
					取消
				</Button>
			</div>
		</form>
	);
}
