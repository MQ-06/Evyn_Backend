import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // ─── GET CART ──────────────────────────────────────────────────────────────────

  async getCart(userId: string) {
    const items = await this.cartItemRepo.find({
      where: { userId },
      relations: ['product', 'product.seller', 'product.category'],
      order: { createdAt: 'ASC' },
    });

    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );

    return {
      items,
      subtotal: parseFloat(subtotal.toFixed(2)),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  // ─── ADD TO CART ───────────────────────────────────────────────────────────────

  async addToCart(userId: string, dto: AddToCartDto): Promise<CartItem> {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId, isActive: true },
    });

    if (!product) throw new NotFoundException('Product not found or no longer available');
    if (product.stock < 1) throw new BadRequestException('Product is out of stock');

    // If product already in cart, merge quantities
    const existing = await this.cartItemRepo.findOne({
      where: { userId, productId: dto.productId },
    });

    if (existing) {
      const merged = existing.quantity + dto.quantity;
      if (merged > product.stock) {
        throw new BadRequestException(
          `You already have ${existing.quantity} in your cart. Only ${product.stock - existing.quantity} more available.`,
        );
      }
      existing.quantity = merged;
      return this.cartItemRepo.save(existing);
    }

    if (dto.quantity > product.stock) {
      throw new BadRequestException(`Only ${product.stock} items in stock`);
    }

    const item = this.cartItemRepo.create({
      userId,
      productId: dto.productId,
      quantity: dto.quantity,
    });
    return this.cartItemRepo.save(item);
  }

  // ─── UPDATE QUANTITY ───────────────────────────────────────────────────────────

  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartItem> {
    const item = await this.cartItemRepo.findOne({ where: { id: itemId, userId } });
    if (!item) throw new NotFoundException('Cart item not found');

    const product = await this.productRepo.findOne({ where: { id: item.productId } });
    if (!product || !product.isActive) {
      throw new BadRequestException('Product is no longer available');
    }
    if (dto.quantity > product.stock) {
      throw new BadRequestException(`Only ${product.stock} items in stock`);
    }

    item.quantity = dto.quantity;
    return this.cartItemRepo.save(item);
  }

  // ─── REMOVE ITEM ───────────────────────────────────────────────────────────────

  async removeItem(userId: string, itemId: string): Promise<void> {
    const item = await this.cartItemRepo.findOne({ where: { id: itemId, userId } });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.cartItemRepo.remove(item);
  }

  // ─── CLEAR ENTIRE CART (called by OrdersService after checkout) ────────────────

  async clearCart(userId: string): Promise<void> {
    await this.cartItemRepo.delete({ userId });
  }
}
