import type { RequestContext } from '@/src/lib/context/request-context';
import type { OrderWithRelations } from '@/src/domain/models';

export interface OrderDeliveryStrategy {
  send(ctx: RequestContext, order: OrderWithRelations): Promise<boolean>;
}

