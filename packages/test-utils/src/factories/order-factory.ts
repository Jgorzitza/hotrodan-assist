import { faker } from '@faker-js/faker';

export interface Order {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  shipping: {
    address: Address;
    method: string;
    cost: number;
  };
  payment: {
    method: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    amount: number;
    currency: string;
  };
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface CreateOrderOptions {
  userId?: string;
  status?: Order['status'];
  items?: Partial<OrderItem>[];
  shipping?: Partial<Order['shipping']>;
  payment?: Partial<Order['payment']>;
}

export class OrderFactory {
  private static idCounter = 1;

  static create(options: CreateOrderOptions = {}): Order {
    const id = `order-${this.idCounter++}`;
    const createdAt = faker.date.past();
    const items = this.createOrderItems(options.items);
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08; // 8% tax
    const shippingCost = options.shipping?.cost || faker.number.float({ min: 5, max: 25, fractionDigits: 2 });
    const total = subtotal + tax + shippingCost;
    
    return {
      id,
      userId: options.userId || faker.string.uuid(),
      status: options.status || faker.helpers.arrayElement(['pending', 'processing', 'shipped', 'delivered']),
      items,
      shipping: {
        address: {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state(),
          zipCode: faker.location.zipCode(),
          country: faker.location.country()
        },
        method: faker.helpers.arrayElement(['standard', 'express', 'overnight']),
        cost: shippingCost,
        ...options.shipping
      },
      payment: {
        method: faker.helpers.arrayElement(['credit_card', 'paypal', 'bank_transfer']),
        status: faker.helpers.arrayElement(['pending', 'completed', 'failed', 'refunded']),
        amount: total,
        currency: 'USD',
        ...options.payment
      },
      totals: {
        subtotal,
        tax,
        shipping: shippingCost,
        total
      },
      createdAt,
      updatedAt: faker.date.between({ from: createdAt, to: new Date() })
    };
  }

  static createMany(count: number, options: CreateOrderOptions = {}): Order[] {
    return Array.from({ length: count }, () => this.create(options));
  }

  static createPending(options: Omit<CreateOrderOptions, 'status'> = {}): Order {
    return this.create({ ...options, status: 'pending' });
  }

  static createCompleted(options: Omit<CreateOrderOptions, 'status'> = {}): Order {
    return this.create({ 
      ...options, 
      status: 'delivered',
      payment: { 
        status: 'completed',
        method: 'credit_card',
        amount: 0,
        currency: 'USD',
        ...options.payment 
      }
    });
  }

  static createCancelled(options: Omit<CreateOrderOptions, 'status'> = {}): Order {
    return this.create({ ...options, status: 'cancelled' });
  }

  private static createOrderItems(items?: Partial<OrderItem>[]): OrderItem[] {
    if (items && items.length > 0) {
      return items.map(item => ({
        productId: item.productId || faker.string.uuid(),
        quantity: item.quantity || faker.number.int({ min: 1, max: 5 }),
        price: item.price || faker.number.float({ min: 10, max: 100, fractionDigits: 2 }),
        name: item.name || faker.commerce.productName()
      }));
    }

    // Create random items
    const itemCount = faker.number.int({ min: 1, max: 5 });
    return Array.from({ length: itemCount }, () => ({
      productId: faker.string.uuid(),
      quantity: faker.number.int({ min: 1, max: 5 }),
      price: faker.number.float({ min: 10, max: 100, fractionDigits: 2 }),
      name: faker.commerce.productName()
    }));
  }

  static reset(): void {
    this.idCounter = 1;
  }
}
