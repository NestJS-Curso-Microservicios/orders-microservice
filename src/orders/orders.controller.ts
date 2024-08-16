import { Controller } from '@nestjs/common';
import {EventPattern, MessagePattern, Payload} from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import {
	ChangeOrderStatusDto,
	CreateOrderDto,
	PaginationOrderDto, PaidOrderDto,
} from './dto';

@Controller()
export class OrdersController {
	constructor(private readonly ordersService: OrdersService) {}

	@MessagePattern('createOrder')
	async create(@Payload() createOrderDto: CreateOrderDto) {
		const order = await this.ordersService.create(createOrderDto);
		const paymentSession = await this.ordersService.createPaymentSession(order);
		return {
			order,
			paymentSession,
		};
	}

	@MessagePattern('findAllOrders')
	async findAll(@Payload() paginationOrderDto: PaginationOrderDto) {
		return await this.ordersService.findAll(paginationOrderDto);
	}

	@MessagePattern('findOneOrder')
	async findOne(@Payload() id: string) {
		return await this.ordersService.findOne(id);
	}

	@MessagePattern('changeOrderStatus')
	async changeOrderStatus(
		@Payload() changeOrderStatusDto: ChangeOrderStatusDto
	) {
		return this.ordersService.changeStatus(changeOrderStatusDto);
	}

	@EventPattern('payment.succeeded')
	async handlePaymentSucceeded(@Payload() paidOrderDto: PaidOrderDto) {
		return this.ordersService.handlePaymentSucceeded(paidOrderDto);
	}
}
