import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CartItem, Product])],
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService], // OrdersModule will call clearCart() after checkout
})
export class CartModule {}
