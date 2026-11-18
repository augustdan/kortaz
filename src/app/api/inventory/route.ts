import { NextResponse } from 'next/server';
import { CreateProductSchema, InventoryMovementSchema } from '@/lib/validations/schemas';
import { appendAuditLog, mutateDb, uid } from '@/lib/server/store';
import { requireAuthorizedSession } from '@/lib/server/request-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const kind = body?.kind as string;

    if (kind === 'movement') {
      const auth = await requireAuthorizedSession({
        request,
        resource: 'inventory',
        action: 'can_edit',
        targetTenantId: body?.tenantId,
      });
      if (!auth.ok) return auth.response;

      const parsed = InventoryMovementSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
      }

      const result = await mutateDb((db) => {
        const prod = db.products.find(
          (p) => p.id === parsed.data.productId && p.tenant_id === parsed.data.tenantId
        );
        if (!prod) return { ok: false, error: 'Produto não encontrado.' };

        if (parsed.data.movementType === 'in') {
          prod.stock_quantity += parsed.data.quantity;
        } else {
          if (prod.stock_quantity < parsed.data.quantity) {
            return {
              ok: false,
              error: `Estoque insuficiente (${prod.stock_quantity} disponíveis).`,
            };
          }
          prod.stock_quantity -= parsed.data.quantity;
        }

        const movement = {
          id: uid('inv'),
          tenant_id: parsed.data.tenantId,
          branch_id: parsed.data.branchId,
          product_id: prod.id,
          movement_type: parsed.data.movementType,
          quantity: parsed.data.quantity,
          unit_cost: prod.cost_price,
          reason: parsed.data.reason,
          created_by: auth.session.profile.id,
          created_at: new Date().toISOString(),
        };
        db.inventory_movements.unshift(movement);
        return { ok: true, product: prod, movement };
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result, { status: 201 });
    }

    if (kind === 'supplier') {
      const auth = await requireAuthorizedSession({
        request,
        resource: 'inventory',
        action: 'can_create',
        targetTenantId: body?.tenantId,
      });
      if (!auth.ok) return auth.response;

      const supplier = await mutateDb((db) => {
        const created = {
          id: uid('sup'),
          tenant_id: body.tenantId,
          name: String(body.name || 'Fornecedor'),
          contact_name: body.contactName,
          phone: body.phone,
          email: body.email,
          created_at: new Date().toISOString(),
        };
        db.suppliers.push(created);
        return created;
      });
      return NextResponse.json({ ok: true, supplier }, { status: 201 });
    }

    const auth = await requireAuthorizedSession({
      request,
      resource: 'inventory',
      action: 'can_create',
      targetTenantId: body?.tenantId,
    });
    if (!auth.ok) return auth.response;

    const parsed = CreateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const product = await mutateDb((db) => {
      const nowIso = new Date().toISOString();
      const created = {
        id: uid('prod'),
        tenant_id: parsed.data.tenantId,
        branch_id: parsed.data.branchId,
        supplier_id: parsed.data.supplierId ?? null,
        name: parsed.data.name,
        sku: parsed.data.sku,
        category: parsed.data.category,
        usage_type: parsed.data.usageType,
        cost_price: parsed.data.costPrice,
        sale_price: parsed.data.salePrice,
        stock_quantity: parsed.data.stockQuantity,
        min_stock_level: parsed.data.minStockLevel,
        is_active: true,
        created_at: nowIso,
      };
      db.products.push(created);
      if (created.stock_quantity > 0) {
        db.inventory_movements.unshift({
          id: uid('inv'),
          tenant_id: created.tenant_id,
          branch_id: created.branch_id,
          product_id: created.id,
          movement_type: 'in',
          quantity: created.stock_quantity,
          unit_cost: created.cost_price,
          reason: 'Saldo inicial de cadastro',
          created_by: auth.session.profile.id,
          created_at: nowIso,
        });
      }
      appendAuditLog(db, {
        tenant_id: created.tenant_id,
        actor_profile_id: auth.session.profile.id,
        action: 'PRODUCT_CREATED',
        entity: 'products',
        entity_id: created.id,
        severity: 'info',
        details: { name: created.name, stock: created.stock_quantity },
      });
      return created;
    });

    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro no módulo de estoque.' },
      { status: 500 }
    );
  }
}
