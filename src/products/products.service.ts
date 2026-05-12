import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto, SortOption } from './dto/product-query.dto';
import { CategoriesService } from '../categories/categories.service';
import { Role } from '../users/enums/role.enum';

export const PRODUCT_CHANGED = 'product.changed';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly categoriesService: CategoriesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(sellerId: string, dto: CreateProductDto): Promise<Product> {
    await this.categoriesService.findOne(dto.categoryId);
    const slug = await this.generateUniqueSlug(dto.name);

    const product = this.productRepo.create({
      name: dto.name,
      slug,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      categoryId: dto.categoryId,
      images: dto.images ?? [],
      isActive: dto.isActive ?? true,
      sellerId,
    });

    const saved = await this.productRepo.save(product);
    this.eventEmitter.emit(PRODUCT_CHANGED, { type: 'created', product: saved });
    return saved;
  }

  async findAll(query: ProductQueryDto) {
    const { page, limit, categoryId, minPrice, maxPrice, inStock, sort } = query;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.seller', 'seller')
      .where('p.isActive = true');

    if (categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId });
    if (minPrice !== undefined) qb.andWhere('p.price >= :minPrice', { minPrice });
    if (maxPrice !== undefined) qb.andWhere('p.price <= :maxPrice', { maxPrice });
    if (inStock) qb.andWhere('p.stock > 0');

    const sortConfig: Record<SortOption, [string, 'ASC' | 'DESC']> = {
      [SortOption.NEWEST]: ['p.createdAt', 'DESC'],
      [SortOption.PRICE_ASC]: ['p.price', 'ASC'],
      [SortOption.PRICE_DESC]: ['p.price', 'DESC'],
    };
    const [col, dir] = sortConfig[sort ?? SortOption.NEWEST];
    qb.orderBy(col, dir);
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { slug, isActive: true },
      relations: ['category', 'seller'],
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findBySeller(sellerId: string): Promise<Product[]> {
    return this.productRepo.find({
      where: { sellerId },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneBySeller(id: string, sellerId: string, role: Role): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== sellerId && role !== Role.ADMIN) {
      throw new ForbiddenException('You can only view your own products');
    }
    return product;
  }

  async update(
    id: string,
    sellerId: string,
    role: Role,
    dto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOneOwned(id, sellerId, role);
    if (dto.categoryId) await this.categoriesService.findOne(dto.categoryId);

    // Only update fields that were actually sent — avoid overwriting with undefined
    if (dto.name !== undefined) {
      product.name = dto.name;
      product.slug = await this.generateUniqueSlug(dto.name, id);
    }
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.stock !== undefined) product.stock = dto.stock;
    if (dto.categoryId !== undefined) product.categoryId = dto.categoryId;
    if (dto.images !== undefined) product.images = dto.images;
    if (dto.isActive !== undefined) product.isActive = dto.isActive;

    const saved = await this.productRepo.save(product);
    this.eventEmitter.emit(PRODUCT_CHANGED, { type: 'updated', product: saved });
    return saved;
  }

  async remove(id: string, sellerId: string, role: Role): Promise<void> {
    const product = await this.findOneOwned(id, sellerId, role);
    const productId = product.id;
    await this.productRepo.remove(product);
    this.eventEmitter.emit(PRODUCT_CHANGED, { type: 'deleted', productId });
  }

  async toggleActive(id: string, sellerId: string, role: Role): Promise<Product> {
    const product = await this.findOneOwned(id, sellerId, role);
    product.isActive = !product.isActive;
    const saved = await this.productRepo.save(product);
    this.eventEmitter.emit(PRODUCT_CHANGED, { type: 'toggled', product: saved });
    return saved;
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────────

  private async findOneOwned(id: string, sellerId: string, role: Role): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== sellerId && role !== Role.ADMIN) {
      throw new ForbiddenException('You can only modify your own products');
    }
    return product;
  }

  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const base = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('p.slug = :slug', { slug: base });
    if (excludeId) qb.andWhere('p.id != :excludeId', { excludeId });

    const exists = await qb.getOne();
    if (!exists) return base;

    // Append a short random suffix to guarantee uniqueness
    return `${base}-${randomBytes(3).toString('hex')}`;
  }
}
