import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

const decimalCol = {
  type: 'decimal' as const,
  precision: 10,
  scale: 2,
  transformer: {
    to: (v: number) => v,
    from: (v: string) => parseFloat(v),
  },
};

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: string;

  // Denormalised — product may be edited/deleted after order; snapshot preserves history
  @Column()
  productId: string;

  @Column()
  sellerId: string;

  @Column({ length: 120 })
  productName: string;

  @Column(decimalCol)
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column(decimalCol)
  lineTotal: number;
}
