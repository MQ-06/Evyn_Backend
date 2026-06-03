import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    try {
      const slug = dto.slug ?? this.toSlug(dto.name);

      const existing = await this.categoryRepo.findOne({
        where: [{ name: dto.name }, { slug }],
      });
      if (existing) throw new ConflictException('Category name or slug already exists');

      const category = this.categoryRepo.create({ name: dto.name, slug });
      return await this.categoryRepo.save(category);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to create category');
    }
  }

  async findAll(): Promise<Category[]> {
    try {
      return await this.categoryRepo.find({ order: { name: 'ASC' } });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch categories');
    }
  }

  async findOne(id: string): Promise<Category> {
    try {
      const category = await this.categoryRepo.findOne({ where: { id } });
      if (!category) throw new NotFoundException('Category not found');
      return category;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Failed to fetch category');
    }
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
}
