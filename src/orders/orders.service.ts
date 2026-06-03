import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatus } from './enums/order-status.enum';
import { PlaceOrderDto } from './dto/place-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { Role } from '../users/enums/role.enum';
import { MailService } from '../mail/mail.service';

const SHIPPING_THRESHOLD = 50;
const SHIPPING_COST = 5;

// Seller: PENDING→CONFIRMED→SHIPPED→DELIVERED (forward-only, no cancel)
// Admin:  same + can cancel from PENDING or CONFIRMED
const SELLER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED],
  [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
};

const ADMIN_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
};

interface OrderTotals {
  subtotal: number;
  shippingCost: number;
  total: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
  ) {}

  // ─── PLACE ORDER ──────────────────────────────────────────────────────────────

  async placeOrder(buyerId: string, dto: PlaceOrderDto): Promise<Order> {
    try {
      const cartItems = await this.cartItemRepo.find({
        where: { userId: buyerId },
        relations: ['product'],
      });

      if (cartItems.length === 0) {
        throw new BadRequestException('Your cart is empty');
      }

      this.validateCartItems(cartItems);
      const totals = this.calculateTotals(cartItems);

      const saved = await this.dataSource.transaction(async (em) => {
        await this.decrementStock(em, cartItems);
        const newOrder = await this.createOrderRecord(em, buyerId, totals, dto);
        await this.createOrderItems(em, newOrder.id, cartItems);
        await em.delete(CartItem, { userId: buyerId });
        return newOrder;
      });

      const order = await this.orderRepo.findOne({
        where: { id: saved.id },
        relations: ['items', 'buyer'],
      });

      return order as Order;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to place order');
    }
  }

  // ─── BUYER: ORDER HISTORY ─────────────────────────────────────────────────────

  async getMyOrders(buyerId: string): Promise<Order[]> {
    try {
      return await this.orderRepo.find({
        where: { buyerId },
        relations: ['items'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch orders');
    }
  }

  // ─── SHARED: ORDER DETAIL ─────────────────────────────────────────────────────

  async getOrderDetail(
    orderId: string,
    userId: string,
    role: Role,
  ): Promise<Order> {
    try {
      const order = await this.orderRepo.findOne({
        where: { id: orderId },
        relations: ['items', 'buyer'],
      });
      if (!order) throw new NotFoundException('Order not found');

      if (role === Role.ADMIN) return order;
      if (role === Role.BUYER && order.buyerId === userId) return order;
      if (
        role === Role.SELLER &&
        order.items.some((i) => i.sellerId === userId)
      )
        return order;

      throw new ForbiddenException('You do not have access to this order');
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch order');
    }
  }

  // ─── SELLER: ORDERS RECEIVED ──────────────────────────────────────────────────

  async getSellerOrders(sellerId: string, role: Role): Promise<Order[]> {
    try {
      if (role === Role.ADMIN) {
        return this.orderRepo.find({
          relations: ['items', 'buyer'],
          order: { createdAt: 'DESC' },
        });
      }

      const sellerItems = await this.orderItemRepo.find({
        where: { sellerId },
        select: { orderId: true },
      });

      if (sellerItems.length === 0) return [];

      const orderIds = [...new Set(sellerItems.map((i) => i.orderId))];

      return this.orderRepo.find({
        where: { id: In(orderIds) },
        relations: ['items', 'buyer'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch seller orders');
    }
  }

  // ─── SELLER / ADMIN: UPDATE STATUS ───────────────────────────────────────────

  async updateStatus(
    orderId: string,
    userId: string,
    role: Role,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    try {
      const order = await this.orderRepo.findOne({
        where: { id: orderId },
        relations: ['items'],
      });
      if (!order) throw new NotFoundException('Order not found');

      if (
        role === Role.SELLER &&
        !order.items.some((i) => i.sellerId === userId)
      ) {
        throw new ForbiddenException(
          'You can only update orders for your own products',
        );
      }

      const allowed =
        role === Role.ADMIN
          ? (ADMIN_TRANSITIONS[order.status] ?? [])
          : (SELLER_TRANSITIONS[order.status] ?? []);

      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot move order from "${order.status}" to "${dto.status}"`,
        );
      }

      order.status = dto.status;
      if (dto.trackingNote !== undefined) order.trackingNote = dto.trackingNote;

      const saved = await this.orderRepo.save(order);

      if (dto.status === OrderStatus.CONFIRMED) {
        const fullOrder = await this.orderRepo.findOne({
          where: { id: saved.id },
          relations: ['items', 'buyer'],
        });
        if (fullOrder?.buyer) {
          void this.dispatchConfirmationEmail(fullOrder);
        }
      }

      return saved;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to update order status');
    }
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────────

  private validateCartItems(cartItems: CartItem[]): void {
    const errors: string[] = [];
    for (const item of cartItems) {
      if (!item.product.isActive) {
        errors.push(`"${item.product.name}" is no longer available`);
      } else if (item.quantity > item.product.stock) {
        errors.push(
          `"${item.product.name}": you requested ${item.quantity} but only ${item.product.stock} left`,
        );
      }
    }
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Some items cannot be fulfilled',
        errors,
      });
    }
  }

  private calculateTotals(cartItems: CartItem[]): OrderTotals {
    const subtotal = parseFloat(
      cartItems
        .reduce((s, i) => s + i.product.price * i.quantity, 0)
        .toFixed(2),
    );
    const shippingCost = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = parseFloat((subtotal + shippingCost).toFixed(2));
    return { subtotal, shippingCost, total };
  }

  private async decrementStock(
    em: EntityManager,
    cartItems: CartItem[],
  ): Promise<void> {
    for (const item of cartItems) {
      const result = await em
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => `stock - ${item.quantity}` })
        .where('id = :id AND stock >= :qty', {
          id: item.productId,
          qty: item.quantity,
        })
        .execute();

      if (!result.affected || result.affected === 0) {
        throw new ConflictException(
          `"${item.product.name}" just sold out. Please remove it from your cart and try again.`,
        );
      }
    }
  }

  private async createOrderRecord(
    em: EntityManager,
    buyerId: string,
    totals: OrderTotals,
    dto: PlaceOrderDto,
  ): Promise<Order> {
    const order = em.create(Order, {
      buyerId,
      status: OrderStatus.PENDING,
      subtotal: totals.subtotal,
      shippingCost: totals.shippingCost,
      total: totals.total,
      shippingAddress: dto.shippingAddress,
      trackingNote: null,
    });
    return em.save(Order, order);
  }

  private async createOrderItems(
    em: EntityManager,
    orderId: string,
    cartItems: CartItem[],
  ): Promise<void> {
    const orderItems = cartItems.map((item) =>
      em.create(OrderItem, {
        orderId,
        productId: item.productId,
        sellerId: item.product.sellerId,
        productName: item.product.name,
        unitPrice: item.product.price,
        quantity: item.quantity,
        lineTotal: parseFloat((item.product.price * item.quantity).toFixed(2)),
      }),
    );
    await em.save(OrderItem, orderItems);
  }

  private async dispatchConfirmationEmail(order: Order): Promise<void> {
    const buyer = order.buyer!;
    await this.mailService.sendOrderConfirmation(
      buyer.email,
      buyer.name,
      order.id,
      order.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
      })),
      order.subtotal,
      order.shippingCost,
      order.total,
    );
  }
}
