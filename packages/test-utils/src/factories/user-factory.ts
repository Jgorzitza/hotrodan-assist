import { faker } from '@faker-js/faker';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
  profile?: {
    avatar?: string;
    bio?: string;
    preferences?: Record<string, any>;
  };
}

export interface CreateUserOptions {
  role?: 'admin' | 'user' | 'viewer';
  email?: string;
  name?: string;
  profile?: Partial<User['profile']>;
}

export class UserFactory {
  private static idCounter = 1;

  static create(options: CreateUserOptions = {}): User {
    const id = `user-${this.idCounter++}`;
    const createdAt = faker.date.past();
    
    return {
      id,
      email: options.email || faker.internet.email(),
      name: options.name || faker.person.fullName(),
      role: options.role || faker.helpers.arrayElement(['admin', 'user', 'viewer']),
      createdAt,
      updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
      profile: {
        avatar: faker.image.avatar(),
        bio: faker.person.bio(),
        preferences: {
          theme: faker.helpers.arrayElement(['light', 'dark']),
          notifications: faker.datatype.boolean(),
          language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de'])
        },
        ...options.profile
      }
    };
  }

  static createMany(count: number, options: CreateUserOptions = {}): User[] {
    return Array.from({ length: count }, () => this.create(options));
  }

  static createAdmin(options: Omit<CreateUserOptions, 'role'> = {}): User {
    return this.create({ ...options, role: 'admin' });
  }

  static createUser(options: Omit<CreateUserOptions, 'role'> = {}): User {
    return this.create({ ...options, role: 'user' });
  }

  static createViewer(options: Omit<CreateUserOptions, 'role'> = {}): User {
    return this.create({ ...options, role: 'viewer' });
  }

  static reset(): void {
    this.idCounter = 1;
  }
}
