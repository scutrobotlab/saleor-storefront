"use client";

import { type FC } from "react";
import { User, MapPin, Phone } from "lucide-react";
import { Label } from "@/ui/components/ui/label";
import { Input } from "@/ui/components/ui/input";
import { cn } from "@/lib/utils";
import { CHINA_PROVINCES, isChinaMunicipalityOrSAR } from "@/checkout/lib/consts/china-provinces";
import { FormSelect, FieldError } from "@/checkout/views/saleor-checkout/address-form-fields";

export interface ChinaAddressFormData {
	firstName: string;
	lastName: string;
	phone: string;
	/** 省 → countryArea */
	countryArea: string;
	/** 市 → city */
	city: string;
	/** 行政区 → cityArea */
	cityArea: string;
	/** 详细地址 → streetAddress1 */
	streetAddress1: string;
	/** 补充地址（可选）→ streetAddress2 */
	streetAddress2?: string;
}

export interface ChinaAddressFieldsProps {
	formData: ChinaAddressFormData;
	errors: Record<string, string>;
	onChange: (field: keyof ChinaAddressFormData, value: string) => void;
	idPrefix?: string;
}

const FieldLabel: FC<{ htmlFor: string; label: string; required?: boolean }> = ({
	htmlFor,
	label,
	required = true,
}) => (
	<Label htmlFor={htmlFor} className="text-sm font-medium">
		{label}
		{!required && <span className="ml-1 font-normal text-muted-foreground">(可选)</span>}
	</Label>
);

const TextInput: FC<{
	id: string;
	placeholder: string;
	value: string;
	onChange: (val: string) => void;
	error?: string;
	icon?: typeof User;
	autoComplete?: string;
	type?: string;
	disabled?: boolean;
}> = ({
	id,
	placeholder,
	value,
	onChange,
	error,
	icon: Icon,
	autoComplete,
	type = "text",
	disabled = false,
}) => (
	<div className="relative">
		{Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
		<Input
			id={id}
			type={type}
			placeholder={placeholder}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			autoComplete={autoComplete}
			disabled={disabled}
			className={cn("h-12", Icon && "pl-10", error && "border-destructive")}
		/>
	</div>
);

/**
 * 中国本土化地址表单字段。
 * 字段顺序：收件人 → 手机 → 省（下拉）→ 市 → 行政区 → 详细地址
 * 国家固定为中国（CN），不渲染国家选择器。
 * 姓名合并为单个输入框，整体写入 firstName，lastName 置空。
 * 数据直接写入 Saleor AddressInput 的对应字段，无需改后端。
 */
export const ChinaAddressFields: FC<ChinaAddressFieldsProps> = ({
	formData,
	errors,
	onChange,
	idPrefix = "",
}) => {
	const id = (field: string) => `${idPrefix}${field}`;

	// 收件人：合并展示，整体存入 firstName，lastName 清空
	const fullName = formData.firstName + (formData.lastName ?? "");
	const handleNameChange = (v: string) => {
		onChange("firstName", v);
		onChange("lastName", "");
	};

	// 直辖市/特别行政区：省与市相同，选省时同步市并锁定市输入
	const isCityLocked = isChinaMunicipalityOrSAR(formData.countryArea);
	const cityDisplayValue = isCityLocked ? formData.countryArea : formData.city;
	const handleCountryAreaChange = (v: string) => {
		onChange("countryArea", v);
		if (isChinaMunicipalityOrSAR(v)) onChange("city", v);
	};

	return (
		<div className="space-y-4">
			{/* 收件人（合并输入） */}
			<div className="space-y-1.5">
				<FieldLabel htmlFor={id("firstName")} label="收件人" />
				<TextInput
					id={id("firstName")}
					placeholder="请输入姓名"
					value={fullName}
					onChange={handleNameChange}
					error={errors.firstName ?? errors.lastName}
					icon={User}
					autoComplete="name"
				/>
				<FieldError error={errors.firstName ?? errors.lastName} />
			</div>

			{/* 手机号 */}
			<div className="space-y-1.5">
				<FieldLabel htmlFor={id("phone")} label="手机号" />
				<TextInput
					id={id("phone")}
					type="tel"
					placeholder="手机号"
					value={formData.phone}
					onChange={(v) => onChange("phone", v)}
					error={errors.phone}
					icon={Phone}
					autoComplete="tel"
				/>
				<FieldError error={errors.phone} />
			</div>

			{/* 省 */}
			<div className="space-y-1.5">
				<FieldLabel htmlFor={id("countryArea")} label="省 / 直辖市 / 自治区" />
				<FormSelect
					id={id("countryArea")}
					value={formData.countryArea}
					onChange={handleCountryAreaChange}
					placeholder="请选择省份"
					autoComplete="address-level1"
					error={errors.countryArea}
					options={CHINA_PROVINCES}
				/>
				<FieldError error={errors.countryArea} />
			</div>

			{/* 市 + 行政区（两列） */}
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-1.5">
					<FieldLabel htmlFor={id("city")} label="市" />
					<TextInput
						id={id("city")}
						placeholder="市"
						value={cityDisplayValue}
						onChange={(v) => onChange("city", v)}
						error={errors.city}
						autoComplete="address-level2"
						disabled={isCityLocked}
					/>
					<FieldError error={errors.city} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel htmlFor={id("cityArea")} label="区 / 县" required={false} />
					<TextInput
						id={id("cityArea")}
						placeholder="区 / 县（可选）"
						value={formData.cityArea ?? ""}
						onChange={(v) => onChange("cityArea", v)}
						error={errors.cityArea}
						autoComplete="address-level3"
					/>
					<FieldError error={errors.cityArea} />
				</div>
			</div>

			{/* 详细地址 */}
			<div className="space-y-1.5">
				<FieldLabel htmlFor={id("streetAddress1")} label="详细地址" />
				<TextInput
					id={id("streetAddress1")}
					placeholder="街道、门牌号、楼层等"
					value={formData.streetAddress1}
					onChange={(v) => onChange("streetAddress1", v)}
					error={errors.streetAddress1}
					icon={MapPin}
					autoComplete="address-line1"
				/>
				<FieldError error={errors.streetAddress1} />
			</div>
		</div>
	);
};
