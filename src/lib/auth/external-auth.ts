/**
 * 将 OpenID Connect 等外部登录返回的 token 写入与 @saleor/auth-sdk 一致的 cookie，
 * 然后刷新页面即可视为已登录。
 */
import { encodeCookieName } from "./constants";

const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

function getKeys(prefix: string) {
	return {
		accessToken: `${prefix}+saleor_auth_access_token`,
		refreshToken: `${prefix}+saleor_auth_module_refresh_token`,
		authState: `${prefix}+saleor_auth_module_auth_state`,
	};
}

export function setExternalAuthTokens(apiUrl: string, accessToken: string, refreshToken: string) {
	if (typeof document === "undefined") return;
	const isSecure = window.location.protocol === "https:";
	const securePart = isSecure ? "; Secure" : "";
	const keys = getKeys(apiUrl);

	const setCookie = (name: string, value: string, maxAge: number) => {
		const cookieName = encodeCookieName(name);
		document.cookie = `${cookieName}=${encodeURIComponent(
			value,
		)}; path=/; max-age=${maxAge}; SameSite=Lax${securePart}`;
	};

	setCookie(keys.accessToken, accessToken, ACCESS_TOKEN_MAX_AGE);
	setCookie(keys.refreshToken, refreshToken, REFRESH_TOKEN_MAX_AGE);
	setCookie(keys.authState, "signedIn", REFRESH_TOKEN_MAX_AGE);
}
