import { useAvailableShippingCountries } from "@/checkout/hooks/use-available-shipping-countries";
import { useCheckout } from "@/checkout/hooks/use-checkout";

/**
 * 判断当前结账是否应使用中国本土化地址表单。
 *
 * 以下任一条件满足即启用：
 * 1. Channel 的可用收货国家仅包含 CN（最准确，随后端配置变更）。
 * 2. Channel slug 以「cny」结尾（快速兜底，无需等接口返回）。
 *
 * 启用后：国家固定为 CN，省/市/区/详细地址使用中国本土布局。
 */
export const useChinaAddressForm = (): boolean => {
	const { checkout } = useCheckout();
	const { availableShippingCountries } = useAvailableShippingCountries();

	const channelSlug = checkout?.channel?.slug ?? "";

	// 快速判断：channel slug 明确为人民币/中国渠道
	if (channelSlug.toLowerCase().includes("cny") || channelSlug.toLowerCase().includes("china")) {
		return true;
	}

	// 精确判断：可用收货国仅剩 CN（已加载完毕才生效）
	if (availableShippingCountries.length > 0) {
		return availableShippingCountries.every((code) => code === "CN");
	}

	return false;
};
