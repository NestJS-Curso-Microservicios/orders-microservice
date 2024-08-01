import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import {
	ChangeOrderStatusDto,
	CreateOrderDto,
	PaginationOrderDto,
} from './dto';

@Controller()
export class OrdersController {
	constructor(private readonly ordersService: OrdersService) {}

	@MessagePattern('createOrder')
	async create(@Payload() createOrderDto: CreateOrderDto) {
		// console.log(createOrderDto);
		return await this.ordersService.create(createOrderDto);
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
}
