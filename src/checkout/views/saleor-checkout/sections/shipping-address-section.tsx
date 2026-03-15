"use client";

import { type FC } from "react";
import { Label } from "@/ui/components/ui/label";
import { FormSelect, FieldError, AddressFields } from "../address-form-fields";
import { HybridAddressSelector } from "@/checkout/components/shipping-address";
import { getCountryName } from "@/checkout/lib/utils/locale";
import type { CountryCode, AddressFragment } from "@/checkout/graphql";
import type { AddressField } from "@/checkout/components/address-form/types";
import {
	ChinaAddressFields,
	type ChinaAddressFormData,
} from "@/checkout/components/address-form/china-address-fields";

// =============================================================================
// Types
// =============================================================================

interface ShippingAddressSectionProps {
	// Auth state
	isAuthenticated: boolean;
	userAddresses: AddressFragment[];
	defaultAddressId?: string;

	// Address selection (logged-in users)
	selectedAddressId: string | null;
	onSelectAddress: (id: string | null) => void;
	showNewAddressForm: boolean;
	onShowNewAddressForm: (show: boolean) => void;

	// Address form (guests/new address)
	countryCode: CountryCode;
	onCountryChange: (code: string) => void;
	availableCountries: CountryCode[];
	formData: Record<string, string>;
	onFieldChange: (field: string, value: string) => void;
	errors: Record<string, string>;

	// Address field configuration (from useAddressFormUtils)
	orderedAddressFields: AddressField[];
	getFieldLabel: (field: AddressField) => string;
	isRequiredField: (field: AddressField) => boolean;
	countryAreaChoices?: Array<{ raw?: unknown; verbose?: unknown }>;

	/** 是否使用中国本土化地址表单（隐藏国家、固定 CN、省/市/区/详细地址顺序） */
	useChinaForm?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export const ShippingAddressSection: FC<ShippingAddressSectionProps> = ({
	isAuthenticated,
	userAddresses,
	defaultAddressId,
	selectedAddressId,
	onSelectAddress,
	showNewAddressForm,
	onShowNewAddressForm,
	countryCode,
	onCountryChange,
	availableCountries,
	formData,
	onFieldChange,
	errors,
	orderedAddressFields,
	getFieldLabel,
	isRequiredField,
	countryAreaChoices,
	useChinaForm = false,
}) => {
	const hasAddresses = userAddresses.length > 0;
	const showAddressList = isAuthenticated && hasAddresses && !showNewAddressForm;

	return (
		<section className="space-y-4">
			<h2 className="text-xl font-semibold">收货地址</h2>

			{showAddressList ? (
				<>
					<HybridAddressSelector
						addresses={userAddresses}
						selectedAddressId={selectedAddressId}
						onSelectAddress={onSelectAddress}
						defaultAddressId={defaultAddressId}
						emptyMessage="您还没有保存任何地址。请在下方输入您的收货地址。"
						addressType="SHIPPING"
						sheetTitle="选择收货地址"
						onAddNew={() => onShowNewAddressForm(true)}
					/>
					{errors.address && <FieldError error={errors.address} />}
				</>
			) : (
				<>
					{/* Back to saved addresses link (for logged-in users) */}
					{isAuthenticated && hasAddresses && showNewAddressForm && (
						<button
							type="button"
							onClick={() => onShowNewAddressForm(false)}
							className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground hover:no-underline"
						>
							← 返回已保存的地址
						</button>
					)}

					{/* 中国模式：不显示国家选择，直接渲染中国地址字段 */}
					{useChinaForm ? (
						<ChinaAddressFields
							formData={formData as unknown as ChinaAddressFormData}
							errors={errors}
							onChange={(field, value) => onFieldChange(field, value)}
						/>
					) : (
						<>
							{/* Country selector */}
							<div className="space-y-2">
								<Label htmlFor="country" className="text-sm font-medium">
									国家/地区
								</Label>
								<FormSelect
									id="country"
									value={countryCode}
									onChange={onCountryChange}
									placeholder="选择国家"
									autoComplete="country"
									options={availableCountries.map((code) => ({
										value: code,
										label: getCountryName(code),
									}))}
								/>
							</div>

							{/* Dynamic address fields */}
							<AddressFields
								orderedFields={orderedAddressFields}
								getFieldLabel={getFieldLabel}
								isRequiredField={isRequiredField}
								formData={formData}
								errors={errors}
								onFieldChange={onFieldChange}
								countryAreaChoices={countryAreaChoices}
							/>
						</>
					)}
				</>
			)}
		</section>
	);
};
