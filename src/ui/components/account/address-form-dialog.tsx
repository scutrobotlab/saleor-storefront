"use client";

import { useState, useTransition, useCallback } from "react";
import { Plus, Pencil } from "lucide-react";
import { type AddressDetailsFragment } from "@/gql/graphql";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
	SheetCloseButton,
} from "@/ui/components/ui/sheet";
import { createAddress, updateAddress } from "@/app/[channel]/(main)/account/actions";
import { CHINA_PROVINCES, isChinaMunicipalityOrSAR } from "@/checkout/lib/consts/china-provinces";

type Props = {
	address?: AddressDetailsFragment;
};

function getInitialCity(countryArea: string, address?: AddressDetailsFragment | null): string {
	if (address?.city) return address.city;
	if (countryArea && isChinaMunicipalityOrSAR(countryArea)) return countryArea;
	return "";
}

type FormFieldsProps = {
	address?: AddressDetailsFragment | null;
	isEditing: boolean;
	error: string;
	isPending: boolean;
	onSubmit: (formData: FormData) => void;
};

function AddressFormFields({ address, isEditing, error, isPending, onSubmit }: FormFieldsProps) {
	const area0 = address?.countryArea ?? "";
	const [countryArea, setCountryArea] = useState(area0);
	const [city, setCity] = useState(() => getInitialCity(area0, address));

	const isCityLocked = isChinaMunicipalityOrSAR(countryArea);
	const handleCountryAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const v = e.target.value;
		setCountryArea(v);
		if (isChinaMunicipalityOrSAR(v)) setCity(v);
	};

	return (
		<form action={onSubmit} className="space-y-4">
			{isEditing && address && <input type="hidden" name="id" value={address.id} />}
			<input type="hidden" name="country" value="CN" />
			<input type="hidden" name="lastName" value="" />

			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}

			<div className="space-y-1.5">
				<Label htmlFor="addr-firstName">收件人</Label>
				<Input
					id="addr-firstName"
					name="firstName"
					autoComplete="name"
					defaultValue={(address?.firstName ?? "") + (address?.lastName ?? "")}
					placeholder="请输入姓名"
					required
				/>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="addr-phone">手机号</Label>
				<Input
					id="addr-phone"
					name="phone"
					type="tel"
					autoComplete="tel"
					defaultValue={address?.phone ?? ""}
					placeholder="手机号"
					required
				/>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="addr-countryArea">省 / 直辖市 / 自治区</Label>
				<select
					id="addr-countryArea"
					name="countryArea"
					autoComplete="address-level1"
					value={countryArea}
					onChange={handleCountryAreaChange}
					required
					className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<option value="" disabled>
						请选择省份
					</option>
					{CHINA_PROVINCES.map((p) => (
						<option key={p.value} value={p.value}>
							{p.label}
						</option>
					))}
				</select>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor="addr-city">市</Label>
					{isCityLocked && <input type="hidden" name="city" value={countryArea} />}
					<Input
						id="addr-city"
						name={isCityLocked ? undefined : "city"}
						autoComplete="address-level2"
						value={isCityLocked ? countryArea : city}
						onChange={(e) => setCity(e.target.value)}
						placeholder="市"
						required
						disabled={isCityLocked}
						className="disabled:cursor-not-allowed disabled:opacity-70"
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="addr-cityArea">
						区 / 县 <span className="text-xs font-normal text-muted-foreground">(可选)</span>
					</Label>
					<Input
						id="addr-cityArea"
						name="cityArea"
						autoComplete="address-level3"
						defaultValue={(address as (typeof address & { cityArea?: string }) | undefined)?.cityArea ?? ""}
						placeholder="区 / 县（可选）"
					/>
				</div>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="addr-streetAddress1">详细地址</Label>
				<Input
					id="addr-streetAddress1"
					name="streetAddress1"
					autoComplete="address-line1"
					defaultValue={address?.streetAddress1}
					placeholder="街道、门牌号、楼层等"
					required
				/>
			</div>

			<div className="flex gap-2 pt-2">
				<Button type="submit" disabled={isPending} className="flex-1">
					{isPending ? "保存中…" : isEditing ? "更新地址" : "添加地址"}
				</Button>
			</div>
		</form>
	);
}

export function AddressFormDialog({ address }: Props) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState("");

	const isEditing = !!address;

	const handleSubmit = useCallback(
		(formData: FormData) => {
			setError("");
			const action = isEditing ? updateAddress : createAddress;

			startTransition(async () => {
				const result = await action(formData);
				if (!result.success) {
					setError(result.error);
				} else {
					setOpen(false);
				}
			});
		},
		[isEditing, startTransition],
	);

	return (
		<>
			{isEditing ? (
				<Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label="编辑地址">
					<Pencil className="h-3.5 w-3.5" />
				</Button>
			) : (
				<Button variant="outline-solid" size="sm" onClick={() => setOpen(true)}>
					<Plus className="mr-1 h-4 w-4" />
					添加地址
				</Button>
			)}
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="overflow-y-auto p-6">
					<SheetHeader className="mb-6">
						<SheetTitle>{isEditing ? "编辑地址" : "添加新地址"}</SheetTitle>
						<SheetDescription className="sr-only">
							{isEditing ? "更新您的地址详情" : "为您的账户添加新地址"}
						</SheetDescription>
						<SheetCloseButton />
					</SheetHeader>
					{open && (
						<AddressFormFields
							key={address?.id ?? "new"}
							address={address}
							isEditing={isEditing}
							error={error}
							isPending={isPending}
							onSubmit={handleSubmit}
						/>
					)}
				</SheetContent>
			</Sheet>
		</>
	);
}
