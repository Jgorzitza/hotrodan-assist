import { faker } from '@faker-js/faker';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  tags: string[];
  inventory: {
    quantity: number;
    lowStockThreshold: number;
    inStock: boolean;
  };
  metadata: {
    sku: string;
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    images: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductOptions {
  name?: string;
  price?: number;
  category?: string;
  tags?: string[];
  inventory?: Partial<Product['inventory']>;
  metadata?: Partial<Product['metadata']>;
}

export class ProductFactory {
  private static idCounter = 1;

  static create(options: CreateProductOptions = {}): Product {
    const id = `product-${this.idCounter++}`;
    const createdAt = faker.date.past();
    const price = options.price || faker.number.float({ min: 10, max: 1000, fractionDigits: 2 });
    const quantity = faker.number.int({ min: 0, max: 100 });
    
    return {
      id,
      name: options.name || faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price,
      currency: 'USD',
      category: options.category || faker.commerce.department(),
      tags: options.tags || faker.helpers.arrayElements([
        'featured', 'new', 'sale', 'bestseller', 'organic', 'premium', 'limited'
      ], { min: 1, max: 3 }),
      inventory: {
        quantity,
        lowStockThreshold: 10,
        inStock: quantity > 0,
        ...options.inventory
      },
      metadata: {
        sku: faker.string.alphanumeric(10).toUpperCase(),
        weight: faker.number.float({ min: 0.1, max: 50, fractionDigits: 2 }),
        dimensions: {
          length: faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
          width: faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
          height: faker.number.float({ min: 1, max: 100, fractionDigits: 1 })
        },
        images: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => 
          faker.image.url()
        ),
        ...options.metadata
      },
      createdAt,
      updatedAt: faker.date.between({ from: createdAt, to: new Date() })
    };
  }

  static createMany(count: number, options: CreateProductOptions = {}): Product[] {
    return Array.from({ length: count }, () => this.create(options));
  }

  static createInStock(options: CreateProductOptions = {}): Product {
    return this.create({
      ...options,
      inventory: {
        quantity: faker.number.int({ min: 1, max: 100 }),
        lowStockThreshold: 10,
        inStock: true,
        ...options.inventory
      }
    });
  }

  static createOutOfStock(options: CreateProductOptions = {}): Product {
    return this.create({
      ...options,
      inventory: {
        quantity: 0,
        lowStockThreshold: 10,
        inStock: false,
        ...options.inventory
      }
    });
  }

  static createLowStock(options: CreateProductOptions = {}): Product {
    const quantity = faker.number.int({ min: 1, max: 9 });
    return this.create({
      ...options,
      inventory: {
        quantity,
        lowStockThreshold: 10,
        inStock: quantity > 0,
        ...options.inventory
      }
    });
  }

  static reset(): void {
    this.idCounter = 1;
  }
}
