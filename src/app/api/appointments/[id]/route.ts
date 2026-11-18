import { NextResponse } from 'next/server';
import { UpdateAppointmentActionSchema } from '@/lib/validations/schemas';
import { applyAppointmentAction } from '@/lib/server/store';
import { requireAuthorizedSession } from '@/lib/server/request-auth';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const parsed = UpdateAppointmentActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Ação inválida.' },
        { status: 400 }
      );
    }

    const actionNeeded =
      parsed.data.action === 'cancel' ? 'can_delete' : 'can_edit';

    const auth = await requireAuthorizedSession({
      request,
      resource: 'appointments',
      action: actionNeeded,
      targetTenantId: body?.tenantId,
    });
    if (!auth.ok) return auth.response;

    const tenantId =
      auth.session.roleCode === 'SUPER_ADMIN'
        ? body?.tenantId
        : auth.session.tenant?.id;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado.' }, { status: 400 });
    }

    const result = await applyAppointmentAction({
      tenantId,
      appointmentId: id,
      action: parsed.data.action,
      actorProfileId: auth.session.profile.id,
      actorRole: auth.session.roleCode,
      newStartsAt: parsed.data.newStartsAt,
      newBarberId: parsed.data.newBarberId,
      reason: parsed.data.reason,
      paymentMethod: parsed.data.paymentMethod,
      amountPaid: parsed.data.amountPaid,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      appointment: result.appointment,
      generatedCommissions: result.generatedCommissions,
      notifiedWaitlistCount: result.notifiedWaitlistCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao atualizar agendamento.' },
      { status: 500 }
    );
  }
}
