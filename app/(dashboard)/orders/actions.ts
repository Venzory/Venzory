/**
 * Close an order manually
 */
export async function closeOrderAction(orderId: string): Promise<{ success: boolean; error?: string }> {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    const result = await orderService.closeOrder(ctx, orderId);

    if (isDomainError(result)) {
      logger.error({ error: result }, 'Service error');
      return { success: false, error: result.message };
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to close order');
    const message = error instanceof Error ? error.message : 'Failed to close order';
    return { success: false, error: message };
  }
}
