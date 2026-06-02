import { z } from 'zod'

export const lineItemSchema = z.object({
  itemId:          z.string().optional(),
  name:            z.string().min(1, 'Item name is required'),
  hsnCode:         z.string().optional(),
  quantity:        z.number().positive('Quantity must be positive'),
  rate:            z.number().nonnegative('Rate cannot be negative'),
  discountPercent: z.number().min(0).max(100).default(0),
  discountType:    z.string().optional().default('%'),
  discountValue:   z.number().min(0).optional().default(0),
  gstPercent:      z.number().min(0).max(100).default(0),
  unit:            z.string().optional(),
})

export const createInvoiceSchema = z.object({
  customerId:         z.string().min(1, 'Customer is required'),
  date:               z.string().or(z.date()),
  dueDate:            z.string().or(z.date()).optional(),
  lineItems:          z.array(lineItemSchema).min(1, 'At least one line item is required'),
  invoiceDiscount:    z.number().min(0).default(0),   // invoice-level absolute discount
  discount:           z.number().optional().default(0),
  placeOfSupply:      z.string().optional(),           // GST compliance
  notes:              z.string().optional(),
  paymentTerms:       z.string().optional(),
  termsAndConditions: z.string().optional(),
  linkedQuotationId:  z.string().optional(),
  linkedSalesOrderId: z.string().optional(),
  taxType:            z.enum(['GST', 'VAT', 'Sales Tax', 'None']).default('GST'),
  taxRate:            z.number().min(0).optional().nullable(),
  isTaxed:            z.boolean().default(true),
  useProductSpecificTax: z.boolean().optional().default(true),
  tdsTcsType:         z.enum(['None', 'TDS', 'TCS']).optional().default('None'),
  tdsPercentage:      z.number().optional().default(0),
  tcsPercentage:      z.number().optional().default(0),
  includeTerms:       z.boolean().optional().default(true),
  includeSignature:   z.boolean().optional().default(false),
  includeBankDetails: z.boolean().optional().default(true),
  includeUpiQr:       z.boolean().optional().default(true),
})

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amount:    z.number().positive('Payment amount must be positive'),
  date:      z.string().or(z.date()),
  mode:      z.enum(['Cash', 'UPI', 'NEFT', 'RTGS', 'Cheque', 'Card', 'Bank', 'Credit']),
  reference: z.string().optional(),
  notes:     z.string().optional(),
})

export const createPurchaseBillSchema = z.object({
  vendorId:  z.string().min(1),
  date:      z.string().or(z.date()),
  dueDate:   z.string().or(z.date()).optional(),
  lineItems: z.array(lineItemSchema).min(1),
  discount:  z.number().optional().default(0),
  notes:     z.string().optional(),
  taxType:            z.enum(['GST', 'VAT', 'Sales Tax', 'None']).optional().default('GST'),
  taxRate:            z.number().min(0).optional().nullable(),
  isTaxed:            z.boolean().optional().default(true),
  useProductSpecificTax: z.boolean().optional().default(true),
  tdsTcsType:         z.enum(['None', 'TDS', 'TCS']).optional().default('None'),
  tdsPercentage:      z.number().optional().default(0),
  tcsPercentage:      z.number().optional().default(0),
  includeTerms:       z.boolean().optional().default(true),
  includeSignature:   z.boolean().optional().default(false),
  includeBankDetails: z.boolean().optional().default(true),
  includeUpiQr:       z.boolean().optional().default(true),
})

export const createQuotationSchema = z.object({
  customerId:  z.string().min(1),
  date:        z.string().or(z.date()),
  validUntil:  z.string().or(z.date()).optional(),
  lineItems:   z.array(lineItemSchema).min(1),
  notes:       z.string().optional(),
  includeTerms:       z.boolean().optional().default(true),
  includeSignature:   z.boolean().optional().default(false),
  includeBankDetails: z.boolean().optional().default(true),
  includeUpiQr:       z.boolean().optional().default(true),
})

export const createCreditNoteSchema = z.object({
  invoiceId: z.string().min(1),
  amount:    z.number().positive(),
  reason:    z.string().min(1),
  reference: z.string().optional(),
  salesPerson: z.string().optional(),
  subject: z.string().optional(),
  termsAndConditions: z.string().optional(),
  subTotal: z.number().optional(),
  taxTotal: z.number().optional(),
  lineItems: z.array(z.object({
    itemId:          z.string().optional(),
    name:            z.string(),
    quantity:        z.number().positive(),
    rate:            z.number().optional(),
    discountPercent: z.number().optional(),
    gstPercent:      z.number().optional(),
    amount:          z.number().optional(),
  })).optional(),
  includeTerms:       z.boolean().optional().default(true),
  includeSignature:   z.boolean().optional().default(false),
  includeBankDetails: z.boolean().optional().default(true),
  includeUpiQr:       z.boolean().optional().default(true),
})
