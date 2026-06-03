import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Role } from '../users/enums/role.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
  ) {}

  // ─── SELLERS ──────────────────────────────────────────────────────────────────

  async listSellers() {
    try {
      return await this.listUsersWithStats(Role.SELLER);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch sellers');
    }
  }

  async getSeller(id: string) {
    try {
      return await this.getUserWithStats(id, Role.SELLER);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch seller');
    }
  }

  async toggleSeller(id: string) {
    try {
      return await this.toggleUserActive(id, Role.SELLER);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to toggle seller status');
    }
  }

  async deleteSeller(id: string, requesterId: string) {
    try {
      return await this.deleteUser(id, Role.SELLER, requesterId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to delete seller');
    }
  }

  // ─── BUYERS ───────────────────────────────────────────────────────────────────

  async listBuyers() {
    try {
      return await this.listUsersWithStats(Role.BUYER);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch buyers');
    }
  }

  async getBuyer(id: string) {
    try {
      return await this.getUserWithStats(id, Role.BUYER);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch buyer');
    }
  }

  async toggleBuyer(id: string) {
    try {
      return await this.toggleUserActive(id, Role.BUYER);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to toggle buyer status');
    }
  }

  async deleteBuyer(id: string, requesterId: string) {
    try {
      return await this.deleteUser(id, Role.BUYER, requesterId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to delete buyer');
    }
  }

  // ─── PRODUCTS ─────────────────────────────────────────────────────────────────

  async listAllProducts() {
    try {
      return await this.productRepo.find({
        relations: ['category', 'seller'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch products');
    }
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────────

  private async listUsersWithStats(role: Role) {
    const users = await this.userRepo.find({
      where: { role },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(users.map((u) => this.attachStats(u, role)));
  }

  private async getUserWithStats(id: string, role: Role) {
    const user = await this.userRepo.findOne({ where: { id, role } });
    if (!user) throw new NotFoundException('User not found');
    return this.attachStats(user, role);
  }

  private async attachStats(user: User, role: Role) {
    const stats = role === Role.SELLER ? await this.getSellerStats(user.id) : null;
    return this.formatUserResponse(user, role, stats);
  }

  private async getSellerStats(
    sellerId: string,
  ): Promise<{ productCount: number; orderCount: number }> {
    const productCount = await this.productRepo.count({ where: { sellerId } });
    const sellerItems = await this.orderItemRepo.find({
      where: { sellerId },
      select: { orderId: true },
    });
    const orderCount = new Set(sellerItems.map((i) => i.orderId)).size;
    return { productCount, orderCount };
  }

  private formatUserResponse(
    user: User,
    role: Role,
    stats: { productCount: number; orderCount: number } | null,
  ) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      businessName: user.businessName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      ...(role === Role.SELLER && stats && { ...stats }),
    };
  }

  private async toggleUserActive(id: string, role: Role) {
    const user = await this.userRepo.findOne({ where: { id, role } });
    if (!user) throw new NotFoundException('User not found');

    user.isActive = !user.isActive;
    await this.userRepo.save(user);

    return { id: user.id, isActive: user.isActive };
  }

  private async deleteUser(id: string, role: Role, requesterId: string) {
    if (id === requesterId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.userRepo.findOne({ where: { id, role } });
    if (!user) throw new NotFoundException('User not found');

    if (role === Role.SELLER) {
      const productCount = await this.productRepo.count({ where: { sellerId: id } });
      if (productCount > 0) {
        throw new BadRequestException(
          'Cannot delete seller with active products. Deactivate them first.',
        );
      }
    }

    await this.userRepo.remove(user);
    return { message: 'User deleted' };
  }
}
