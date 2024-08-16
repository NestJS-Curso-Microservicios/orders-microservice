import {OrderStatus} from "@prisma/client";

export interface OrderWithProductsInterface {
    OrderItems: {
        name: any;
        productId: number;
        price: number;
        quantity: number;
    }[];
    id: string;
    totalAmount: number;
    totalItems: number;
    status: OrderStatus;
    paid: boolean;
    paidAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
