import {
  BadRequestException,
  ForbiddenException,
  Injectable,
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
    return this.listUsersWithStats(Role.SELLER);
  }

  async getSeller(id: string) {
    return this.getUserWithStats(id, Role.SELLER);
  }

  async toggleSeller(id: string) {
    return this.toggleUserActive(id, Role.SELLER);
  }

  async deleteSeller(id: string, requesterId: string) {
    return this.deleteUser(id, Role.SELLER, requesterId);
  }

  // ─── BUYERS ───────────────────────────────────────────────────────────────────

  async listBuyers() {
    return this.listUsersWithStats(Role.BUYER);
  }

  async getBuyer(id: string) {
    return this.getUserWithStats(id, Role.BUYER);
  }

  async toggleBuyer(id: string) {
    return this.toggleUserActive(id, Role.BUYER);
  }

  async deleteBuyer(id: string, requesterId: string) {
    return this.deleteUser(id, Role.BUYER, requesterId);
  }

  // ─── PRODUCTS ─────────────────────────────────────────────────────────────────

  async listAllProducts() {
    return this.productRepo.find({
      relations: ['category', 'seller'],
      order: { createdAt: 'DESC' },
    });
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
    let productCount = 0;
    let orderCount = 0;

    if (role === Role.SELLER) {
      productCount = await this.productRepo.count({ where: { sellerId: user.id } });
      const sellerItems = await this.orderItemRepo.find({
        where: { sellerId: user.id },
        select: { orderId: true },
      });
      const uniqueOrders = new Set(sellerItems.map((i) => i.orderId));
      orderCount = uniqueOrders.size;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      businessName: user.businessName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      ...(role === Role.SELLER && { productCount, orderCount }),
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
