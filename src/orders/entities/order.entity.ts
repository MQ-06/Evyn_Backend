import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../enums/order-status.enum';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const decimalCol = {
  type: 'decimal' as const,
  precision: 10,
  scale: 2,
  transformer: {
    to: (v: number) => v,
    from: (v: string) => parseFloat(v),
  },
};

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true, eager: false })
  @JoinColumn({ name: 'buyerId' })
  buyer: User | null;

  @Column({ nullable: true })
  buyerId: string | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column(decimalCol)
  subtotal: number;

  @Column(decimalCol)
  shippingCost: number;

  @Column(decimalCol)
  total: number;

  @Column({ type: 'json' })
  shippingAddress: ShippingAddress;

  @Column({ nullable: true, type: 'text' })
  trackingNote: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
