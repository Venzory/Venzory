import { OrderDeliveryStrategy } from './types';
import { EmailOrderDeliveryStrategy } from './email-strategy';
import type { OrderWithRelations } from '@/src/domain/models';

export class DeliveryStrategyResolver {
  private strategies: Map<string, OrderDeliveryStrategy>;
  private defaultStrategy: OrderDeliveryStrategy;

  constructor() {
    this.strategies = new Map();
    // Initialize default strategy
    this.defaultStrategy = new EmailOrderDeliveryStrategy();
    // Register default strategy
    this.strategies.set('EMAIL', this.defaultStrategy);
  }

  resolve(order: OrderWithRelations): OrderDeliveryStrategy {
    // In the future, we can inspect the order/supplier configuration
    // to determine the correct strategy (e.g. check if supplier has API integration configured)
    // For now, return the default email strategy
    
    // Example logic for future expansion:
    // const integrationType = order.practiceSupplier?.integrationType;
    // if (integrationType && this.strategies.has(integrationType)) {
    //   return this.strategies.get(integrationType)!;
    // }

    return this.defaultStrategy;
  }

  registerStrategy(key: string, strategy: OrderDeliveryStrategy) {
    this.strategies.set(key, strategy);
  }
}

