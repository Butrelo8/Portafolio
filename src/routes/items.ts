import { and, asc, eq, gt } from 'drizzle-orm';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import { db } from '../db';
import { items } from '../db/schema';
import { AppError } from '../lib/errors';
import { type AuthOptions, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

const updateSchema = createSchema.partial();

const idParams = z.object({ id: z.string().uuid() });

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : String(v)),
    z.string().uuid().optional(),
  ),
});

export function itemsRoute(auth: AuthOptions): Hono {
  const app = new Hono();
  app.use('*', requireAuth(auth));

  app.get('/', validate({ query: listQuery }), async (c) => {
    const ownerId = c.get('userId');
    const { limit, cursor } = c.get('validated').query as z.infer<typeof listQuery>;
    const conditions = cursor
      ? and(eq(items.ownerId, ownerId), gt(items.id, cursor))
      : eq(items.ownerId, ownerId);
    const rows = await db
      .select()
      .from(items)
      .where(conditions)
      .orderBy(asc(items.id))
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return c.json({
      items: page,
      nextCursor: hasMore && last ? last.id : null,
    });
  });

  app.post('/', validate({ json: createSchema }), async (c) => {
    const ownerId = c.get('userId');
    const body = c.get('validated').json as z.infer<typeof createSchema>;
    const insertValues =
      body.description === undefined
        ? { ownerId, name: body.name }
        : { ownerId, name: body.name, description: body.description };
    const [row] = await db.insert(items).values(insertValues).returning();
    return c.json({ item: row }, 201 as ContentfulStatusCode);
  });

  app.get('/:id', validate({ params: idParams }), async (c) => {
    const ownerId = c.get('userId');
    const { id } = c.get('validated').params as z.infer<typeof idParams>;
    const [row] = await db
      .select()
      .from(items)
      .where(and(eq(items.id, id), eq(items.ownerId, ownerId)));
    if (!row) throw new AppError('NOT_FOUND', 'Item not found', 404);
    return c.json({ item: row });
  });

  app.patch('/:id', validate({ params: idParams, json: updateSchema }), async (c) => {
    const ownerId = c.get('userId');
    const { id } = c.get('validated').params as z.infer<typeof idParams>;
    const body = c.get('validated').json as z.infer<typeof updateSchema>;
    const patch: { name?: string; description?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (body.name !== undefined) patch.name = body.name;
    if (body.description !== undefined) patch.description = body.description;
    const [row] = await db
      .update(items)
      .set(patch)
      .where(and(eq(items.id, id), eq(items.ownerId, ownerId)))
      .returning();
    if (!row) throw new AppError('NOT_FOUND', 'Item not found', 404);
    return c.json({ item: row });
  });

  app.delete('/:id', validate({ params: idParams }), async (c) => {
    const ownerId = c.get('userId');
    const { id } = c.get('validated').params as z.infer<typeof idParams>;
    const [row] = await db
      .delete(items)
      .where(and(eq(items.id, id), eq(items.ownerId, ownerId)))
      .returning();
    if (!row) throw new AppError('NOT_FOUND', 'Item not found', 404);
    return c.json({ ok: true });
  });

  return app;
}
