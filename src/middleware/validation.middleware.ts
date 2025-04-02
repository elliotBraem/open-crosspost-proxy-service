import { Context, Next } from '../../deps.ts';
import { z } from '../../deps.ts';

/**
 * Validation Middleware
 * Provides request validation using Zod schemas
 */
export class ValidationMiddleware {
  /**
   * Validate request body against a Zod schema
   * @param schema Zod schema to validate against
   * @returns Middleware function
   */
  static validateBody(schema: z.ZodType) {
    return async (c: Context, next: Next) => {
      try {
        const body = await c.req.json();
        const result = schema.safeParse(body);

        if (!result.success) {
          return c.json({
            error: 'Validation Error',
            details: result.error.errors,
          }, 400);
        }

        // Store validated data in context
        c.set('validatedBody', result.data);
        await next();
      } catch (error) {
        return c.json({
          error: 'Invalid JSON',
          message: error instanceof Error ? error.message : 'Failed to parse request body',
        }, 400);
      }
    };
  }

  /**
   * Validate request params against a Zod schema
   * @param schema Zod schema to validate against
   * @returns Middleware function
   */
  static validateParams(schema: z.ZodType) {
    return async (c: Context, next: Next) => {
      const params = c.req.param();
      const result = schema.safeParse(params);

      if (!result.success) {
        return c.json({
          error: 'Validation Error',
          details: result.error.errors,
        }, 400);
      }

      // Store validated data in context
      c.set('validatedParams', result.data);
      await next();
    };
  }

  /**
   * Validate request query against a Zod schema
   * @param schema Zod schema to validate against
   * @returns Middleware function
   */
  static validateQuery(schema: z.ZodType) {
    return async (c: Context, next: Next) => {
      const query = c.req.query();
      const result = schema.safeParse(query);

      if (!result.success) {
        return c.json({
          error: 'Validation Error',
          details: result.error.errors,
        }, 400);
      }

      // Store validated data in context
      c.set('validatedQuery', result.data);
      await next();
    };
  }
}
