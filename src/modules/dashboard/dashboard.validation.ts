import { z } from 'zod';

export const dashboardSummaryQuerySchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be in YYYY-MM format')
      .optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    recentPage: z.coerce.number().int().min(1).default(1),
    recentLimit: z.coerce.number().int().min(1).max(100).default(5),
    groupBy: z.enum(['day', 'month']).optional(),
  })
  .superRefine((value, ctx) => {
    const hasStartDate = Boolean(value.startDate);
    const hasEndDate = Boolean(value.endDate);

    if (hasStartDate !== hasEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate and endDate must be provided together',
      });
      return;
    }

    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate must be earlier than or equal to endDate',
      });
    }
  });

export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
