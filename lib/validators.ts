import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  displayName: z.string().min(1, "Display name is required.").max(60, "Display name is too long.")
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Password is required.")
});

export const groupSchema = z.object({
  name: z.string().min(1, "Group name is required.").max(80, "Group name is too long."),
  category: z.string().optional().nullable()
});

export const joinSchema = z.object({
  inviteCode: z.string().min(6, "Invite code is required.").max(12)
});

export const profileSchema = z.object({
  displayName: z.string().min(1, "Display name is required.").max(60, "Display name is too long.")
});

export const expenseBaseSchema = z.object({
  description: z.string().min(1, "Expense description is required.").max(120, "Description is too long."),
  totalAmount: z.string().min(1, "Total amount is required."),
  payerId: z.string().uuid("Select a payer."),
  splitType: z.enum(["equal", "percentage", "share", "unequal"]),
  date: z.string().min(1, "Select a date.")
});

export const settlementSchema = z.object({
  payerId: z.string().uuid("Select a payer."),
  payeeId: z.string().uuid("Select a payee."),
  amount: z.string().min(1, "Settlement amount is required."),
  date: z.string().min(1, "Select a date.")
});

export const messageSchema = z.object({
  body: z.string().min(1, "Message cannot be empty.").max(500, "Message is too long.")
});
