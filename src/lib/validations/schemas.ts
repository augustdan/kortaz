import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  tenantSlug: z.string().optional(),
});

export const RegisterTenantSchema = z.object({
  ownerName: z.string().min(2, 'Nome completo obrigatório'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(8, 'Telefone válido obrigatório'),
  password: z.string().min(6, 'Senha mínima de 6 caracteres'),
  barbershopName: z.string().min(2, 'Nome do estabelecimento obrigatório'),
  slug: z
    .string()
    .min(3, 'Slug mínimo 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen'),
  businessType: z.enum(['barbershop', 'salon', 'unisex']).default('unisex'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().min(2, 'UF obrigatória').max(2),
  address: z.string().min(4, 'Endereço obrigatório'),
  planCode: z.enum(['free', 'starter', 'pro', 'premium', 'business', 'enterprise']).default('pro'),
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
});

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(10, 'Token inválido'),
  newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
});

export const CreateAppointmentSchema = z.object({
  tenantId: z.string().min(1),
  branchId: z.string().min(1),
  barberId: z.string().min(1).optional().nullable(), // null/vazio = qualquer profissional disponível (agenda inteligente)
  serviceIds: z.array(z.string().min(1)).min(1, 'Selecione ao menos um serviço'),
  startsAt: z.string().datetime({ offset: true, message: 'Data e hora inválidas' }),
  customerName: z.string().min(2, 'Nome obrigatório'),
  customerPhone: z.string().min(8, 'Telefone / WhatsApp obrigatório'),
  customerEmail: z.string().email('E-mail inválido').optional().or(z.literal('')),
  paymentMethod: z
    .enum(['cash', 'pix', 'debit_card', 'credit_card', 'payment_link', 'deposit', 'partial', 'combined'])
    .default('pix'),
  paymentTiming: z.enum(['now', 'deposit', 'on_arrival']).default('on_arrival'),
  couponCode: z.string().optional().nullable(),
  notes: z.string().max(500).optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.enum(['weekly', 'biweekly', 'monthly']).optional().nullable(),
  source: z.enum(['online', 'admin', 'mobile', 'walk_in', 'squeeze_in', 'recurring']).default('online'),
  lgpdConsent: z.boolean().default(true),
  whatsappOptIn: z.boolean().default(true),
});

export const UpdateAppointmentActionSchema = z.object({
  action: z.enum(['confirm', 'start', 'complete', 'cancel', 'no_show', 'reschedule']),
  newStartsAt: z.string().datetime({ offset: true }).optional(),
  newBarberId: z.string().optional(),
  reason: z.string().max(400).optional(),
  paymentMethod: z
    .enum(['cash', 'pix', 'debit_card', 'credit_card', 'payment_link', 'deposit', 'partial', 'combined'])
    .optional(),
  amountPaid: z.number().nonnegative().optional(),
  forceByBarber: z.boolean().optional(),
});

export const CreateBlockedTimeSchema = z.object({
  tenantId: z.string().min(1),
  branchId: z.string().min(1),
  barberId: z.string().min(1),
  reason: z.string().min(2),
  blockType: z.enum(['manual', 'break', 'day_off', 'vacation']).default('manual'),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
});

export const CreateWaitlistSchema = z.object({
  tenantId: z.string().min(1),
  branchId: z.string().min(1),
  serviceId: z.string().min(1),
  barberId: z.string().optional().nullable(),
  desiredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  desiredPeriod: z.enum(['morning', 'afternoon', 'evening', 'any']).default('any'),
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  customerEmail: z.string().email().optional().or(z.literal('')),
});

export const CreatePaymentCheckoutSchema = z.object({
  tenantId: z.string().min(1),
  appointmentId: z.string().min(1),
  method: z.enum(['pix', 'credit_card', 'debit_card', 'payment_link', 'cash', 'deposit', 'partial', 'combined']),
  amount: z.number().positive(),
  paymentType: z.enum(['full', 'deposit', 'partial', 'remaining']).default('full'),
  payerEmail: z.string().email().optional(),
});

export const RefundPaymentSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().min(3),
});

export const CreateReviewSchema = z.object({
  tenantId: z.string().min(1),
  appointmentId: z.string().min(1),
  barberRating: z.number().int().min(1).max(5),
  serviceRating: z.number().int().min(1).max(5),
  ambienceRating: z.number().int().min(1).max(5),
  overallRating: z.number().int().min(1).max(5),
  comment: z.string().max(600).default(''),
});

export const CreateCustomerSchema = z.object({
  tenantId: z.string().min(1),
  branchId: z.string().optional().nullable(),
  fullName: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal('')),
  birthDate: z.string().optional(),
  notes: z.string().max(600).optional(),
  marketingOptIn: z.boolean().default(true),
  whatsappOptIn: z.boolean().default(true),
});

export const CreateBarberSchema = z.object({
  tenantId: z.string().min(1),
  branchId: z.string().min(1),
  name: z.string().min(2),
  specialty: z.string().min(2),
  audienceFocus: z.enum(['male', 'female', 'unisex']).default('unisex'),
  bio: z.string().max(400).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  defaultCommissionPercent: z.number().min(0).max(100).default(50),
  monthlyRevenueGoal: z.number().nonnegative().default(5000),
  avatarUrl: z.string().optional(),
});

export const CreateServiceSchema = z.object({
  tenantId: z.string().min(1),
  branchId: z.string().optional().nullable(),
  name: z.string().min(2),
  description: z.string().default(''),
  category: z.string().default('Cabelo'),
  audience: z.enum(['male', 'female', 'unisex']).default('unisex'),
  durationMinutes: z.number().int().min(5).max(360),
  bufferMinutes: z.number().int().min(0).max(60).default(0),
  price: z.number().nonnegative(),
  costEstimate: z.number().nonnegative().default(0),
  isFeatured: z.boolean().default(false),
});

export const CreateProductSchema = z.object({
  tenantId: z.string().min(1),
  branchId: z.string().min(1),
  supplierId: z.string().optional().nullable(),
  name: z.string().min(2),
  sku: z.string().optional(),
  category: z.string().default('Finalizadores'),
  usageType: z.enum(['retail', 'internal', 'both']).default('both'),
  costPrice: z.number().nonnegative(),
  salePrice: z.number().nonnegative(),
  stockQuantity: z.number().int().nonnegative(),
  minStockLevel: z.number().int().nonnegative().default(5),
});

export const InventoryMovementSchema = z.object({
  tenantId: z.string().min(1),
  branchId: z.string().min(1),
  productId: z.string().min(1),
  movementType: z.enum(['in', 'out', 'adjustment', 'sale']),
  quantity: z.number().int().positive(),
  reason: z.string().min(2),
});

export const CashRegisterActionSchema = z.object({
  action: z.enum(['open', 'close', 'bleed', 'supply', 'expense']),
  tenantId: z.string().min(1),
  branchId: z.string().min(1),
  amount: z.number().nonnegative(),
  description: z.string().optional(),
  category: z.string().optional(),
  entryKind: z.enum(['payable', 'receivable']).optional(),
  dueDate: z.string().optional(),
});
