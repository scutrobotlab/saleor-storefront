import { type AddressDetailsFragment } from "@/gql/graphql";
import { cn } from "@/lib/utils";

type Props = {
	address: AddressDetailsFragment;
	isDefaultShipping?: boolean;
	className?: string;
	children?: React.ReactNode;
};

export function AccountAddressCard({ address, isDefaultShipping, className, children }: Props) {
	return (
		<div className={cn("rounded-lg border p-4", className)}>
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0 space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						{/* 收件人：存于 firstName，兼容旧数据 lastName+firstName */}
						<span className="font-semibold">
							{address.firstName}
							{address.lastName}
						</span>
						{isDefaultShipping && (
							<span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
								默认收货地址
							</span>
						)}
					</div>
					{/* 中国地址格式：省 市 区 详细地址 */}
					<p className="text-sm text-muted-foreground">
						{[address.countryArea, address.city, address.cityArea].filter(Boolean).join(" ")}
					</p>
					<p className="text-sm text-muted-foreground">{address.streetAddress1}</p>
					{address.phone && <p className="mt-1 text-sm text-muted-foreground">{address.phone}</p>}
				</div>
				{children && <div className="flex shrink-0 items-center gap-1">{children}</div>}
			</div>
		</div>
	);
}
