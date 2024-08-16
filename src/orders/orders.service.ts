import {
	HttpStatus,
	Inject,
	Injectable,
	Logger,
	OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
	ChangeOrderStatusDto,
	PaginationOrderDto,
	CreateOrderDto, PaidOrderDto,
} from './dto';
import { NATS_SERVICE } from '../config';
import { firstValueFrom } from 'rxjs';
import {OrderWithProductsInterface} from "./interfaces/order-with-products.interface";

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
	private readonly logger = new Logger(OrdersService.name);

	constructor(
		@Inject(NATS_SERVICE) private readonly natsClient: ClientProxy
	) {
		super();
	}

	async onModuleInit() {
		await this.$connect().then(() => {
			this.logger.log('Connected to the database');
		});
	}

	async create(createOrderDto: CreateOrderDto) {
		try {
			const products = await firstValueFrom(
				this.natsClient.send(
					'validate_products',
					createOrderDto.items.map((product) => product.productId)
				)
			);

			const totalAmount = createOrderDto.items.reduce(
				(acc, orderItem) => {
					const price = products.find(
						(product) => product.id === orderItem.productId
					).price;
					return acc + price * orderItem.quantity;
				},
				0
			);

			const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
				return acc + orderItem.quantity;
			}, 0);

			const order = await this.order.create({
				data: {
					totalAmount,
					totalItems,
					OrderItems: {
						createMany: {
							data: createOrderDto.items.map((orderItem) => {
								return {
									quantity: orderItem.quantity,
									productId: orderItem.productId,
									price: products.find(
										(product) =>
											product.id === orderItem.productId
									).price,
								};
							}),
						},
					},
				},
				include: {
					OrderItems: {
						select: {
							quantity: true,
							price: true,
							productId: true,
						},
					},
				},
			});

			return {
				...order,
				OrderItems: order.OrderItems.map((item) => ({
					...item,
					name: products.find(
						(product) => product.id === item.productId
					).name,
				})),
			};
		} catch (error) {
			throw new RpcException({
				message: error.message,
				status: HttpStatus.BAD_REQUEST,
			});
		}
	}

	async findAll(paginationOrderDto: PaginationOrderDto) {
		const { page, limit, status } = paginationOrderDto;

		const total = await this.order.count();

		const orders = await this.order.findMany({
			skip: (page - 1) * limit,
			take: limit,
			where: {
				status: status,
			},
		});

		return {
			meta: {
				total,
				page,
				limit,
				lastPage: Math.ceil(total / limit),
			},
			data: orders,
		};
	}

	async findOne(id: string) {
		const order = await this.order.findFirst({
			where: {
				id,
			},
			include: {
				OrderItems: {
					select: {
						quantity: true,
						price: true,
						productId: true,
					},
				},
			},
		});

		if (!order) {
			throw new RpcException({
				message: `Order with id: ${id} not found`,
				status: HttpStatus.NOT_FOUND,
			});
		}

		const productIds = order.OrderItems.map(
			(orderItem) => orderItem.productId
		);

		const products = await firstValueFrom(
			this.natsClient.send({ cmd: 'validate_products' }, productIds)
		);

		return {
			...order,
			OrderItems: order.OrderItems.map((item) => ({
				...item,
				name: products.find((product) => product.id === item.productId)
					.name,
			})),
		};
	}

	async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
		const { id, status } = changeOrderStatusDto;

		const order = await this.findOne(id);

		if (order.status === status) {
			throw new RpcException({
				message: `Order with id: ${id} already has status: ${status}`,
				status: HttpStatus.BAD_REQUEST,
			});
		}

		return this.order.update({
			where: {
				id,
			},
			data: {
				status,
			},
		});
	}

	async createPaymentSession(order: OrderWithProductsInterface) {
		const paymentSession = await firstValueFrom(
			this.natsClient.send('create.payment.session', {
				orderId: order.id,
				currency: 'usd',
				items: order.OrderItems.map(item=> ({
					name: item.name,
					quantity: item.quantity,
					price: item.price,
				})),
			})
		);

		return paymentSession;
	}

	async handlePaymentSucceeded(paidOrderDto: PaidOrderDto) {
		return this.order.update({
			where: {
				id: paidOrderDto.orderId,
			},
			data: {
				status: 'PAID',
				paid: true,
				paidAt: new Date(),
				stripeChargeId: paidOrderDto.stripePaymentId,
				OrderReceipt: {
					create: {
						receiptUrl: paidOrderDto.receiptUrl,
					}
				}
			},
		});
	}
}
