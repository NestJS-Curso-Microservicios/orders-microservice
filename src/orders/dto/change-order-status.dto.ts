import { IsEnum, IsUUID } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class ChangeOrderStatusDto {
	@IsUUID(4)
	id: string;

	@IsEnum(OrderStatus, {
		message: `Status must be one of the following values: ${Object.values(
			OrderStatus
		).join(', ')}`,
	})
	status: OrderStatus;
}
