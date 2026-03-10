import { AlertCircleIcon, CheckCircleIcon, ClockIcon, XCircle } from "lucide-react";
import { PaymentChargeStatusEnum } from "@/gql/graphql";

type Props = {
	status: PaymentChargeStatusEnum;
};

export const PaymentStatus = async ({ status }: Props) => {
	switch (status) {
		case PaymentChargeStatusEnum.NotCharged:
			return (
				<p className="flex items-center gap-1 text-red-400">
					<XCircle className="h-4 w-4" aria-hidden />
					未支付
				</p>
			);
		case PaymentChargeStatusEnum.Cancelled:
			return (
				<p className="flex items-center gap-1 text-red-400">
					<XCircle className="h-4 w-4" aria-hidden />
					已取消
				</p>
			);
		case PaymentChargeStatusEnum.Refused:
			return (
				<p className="flex items-center gap-1 text-red-400">
					<XCircle className="h-4 w-4" aria-hidden />
					已拒绝
				</p>
			);
		case PaymentChargeStatusEnum.FullyCharged:
			return (
				<p className="flex items-center gap-1 text-green-600">
					<CheckCircleIcon className="h-4 w-4" aria-hidden />
					已支付
				</p>
			);
		case PaymentChargeStatusEnum.FullyRefunded:
			return (
				<p className="flex items-center gap-1 text-green-600">
					<CheckCircleIcon className="h-4 w-4" aria-hidden />
					已退款
				</p>
			);
		case PaymentChargeStatusEnum.PartiallyCharged:
			return (
				<p className="flex items-center gap-1 text-yellow-500">
					<AlertCircleIcon className="h-4 w-4" aria-hidden />
					部分支付
				</p>
			);
		case PaymentChargeStatusEnum.PartiallyRefunded:
			return (
				<p className="flex items-center gap-1 text-yellow-500">
					<AlertCircleIcon className="h-4 w-4" aria-hidden />
					部分退款
				</p>
			);
		case PaymentChargeStatusEnum.Pending:
			return (
				<p className="flex items-center gap-1 text-yellow-500">
					<ClockIcon className="h-4 w-4" aria-hidden />
					待处理
				</p>
			);
	}
};
