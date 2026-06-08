/**
 * customer.validators.js
 * Strict Zod validation for Customer create/update.
 * Prevents attackers from overwriting financial fields via API.
 */
import { z } from 'zod';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX   = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const addressSchema = z.object({
  attention: z.string().optional(),
  country:   z.string().default('India'),
  street1:   z.string().optional(),
  street2:   z.string().optional(),
  city:      z.string().optional(),
  state:     z.string().optional(),
  zipCode:   z.string().optional(),
  phone:     z.string().optional(),
}).optional();

const contactPersonSchema = z.object({
  salutation: z.string().optional().or(z.literal('')),
  firstName:  z.string().optional().or(z.literal('')),
  lastName:   z.string().optional().or(z.literal('')),
  email:      z.string().email().optional().or(z.literal('')),
  workPhone:  z.string().optional().or(z.literal('')),
  mobile:     z.string().optional().or(z.literal('')),
}).optional();

export const createCustomerSchema = z.object({
  companyName:    z.string().min(1, 'Customer/Company name is required').trim(),
  displayName:    z.string().trim().optional(),
  name:           z.string().trim().optional(),
  customerType:   z.enum(['Business', 'Individual']).default('Business'),
  salutation:     z.string().optional(),
  firstName:      z.string().trim().optional(),
  lastName:       z.string().trim().optional(),
  email:          z.string().email('Invalid email address').optional().or(z.literal('')),
  phone:          z.string().optional(),
  mobile:         z.string().optional(),
  workPhone:      z.string().optional(),
  contactPerson:  z.string().optional(),
  currency:       z.string().default('INR'),
  paymentTerms:   z.string().optional(),
  creditPeriod:   z.number().min(0).max(365).default(15),
  openingBalance: z.number().min(0).default(0),
  stateCode:      z.string().max(2).optional(),
  remarks:        z.string().optional(),
  address:        z.string().optional(),
  billingAddress:  addressSchema,
  shippingAddress: addressSchema,
  contactPersons:  z.array(contactPersonSchema).optional(),

  // GST fields with format validation
  gstNumber: z.string()
    .refine(v => !v || GSTIN_REGEX.test(v.toUpperCase().trim()), {
      message: 'Invalid GSTIN format. Expected: 22AAAAA0000A1Z5',
    })
    .optional(),
  gstin: z.string()
    .refine(v => !v || GSTIN_REGEX.test(v.toUpperCase().trim()), {
      message: 'Invalid GSTIN format. Expected: 22AAAAA0000A1Z5',
    })
    .optional(),
  panNumber: z.string()
    .refine(v => !v || PAN_REGEX.test(v.toUpperCase().trim()), {
      message: 'Invalid PAN format. Expected: AAAAA0000A',
    })
    .optional(),

  status: z.enum(['Active', 'Inactive']).default('Active'),
});

/**
 * Strict allowlist for customer updates.
 * Financial fields (outstandingBalance, totalBusiness) are EXCLUDED.
 * companyId and branchId are EXCLUDED.
 */
export const updateCustomerSchema = z.object({
  companyName:     z.string().min(1).trim().optional(),
  displayName:     z.string().trim().optional(),
  name:            z.string().trim().optional(),
  customerType:    z.enum(['Business', 'Individual']).optional(),
  salutation:      z.string().optional(),
  firstName:       z.string().trim().optional(),
  lastName:        z.string().trim().optional(),
  email:           z.string().email().optional().or(z.literal('')),
  phone:           z.string().optional(),
  mobile:          z.string().optional(),
  workPhone:       z.string().optional(),
  contactPerson:   z.string().optional(),
  currency:        z.string().optional(),
  paymentTerms:    z.string().optional(),
  creditPeriod:    z.number().min(0).max(365).optional(),
  openingBalance:  z.number().min(0).optional(),   // ← ADDED: allow editing opening balance
  stateCode:       z.string().max(2).optional(),
  remarks:         z.string().optional(),
  address:         z.string().optional(),
  billingAddress:  addressSchema,
  shippingAddress: addressSchema,
  contactPersons:  z.array(contactPersonSchema).optional(),
  gstNumber: z.string()
    .refine(v => !v || GSTIN_REGEX.test(v.toUpperCase().trim()), {
      message: 'Invalid GSTIN format',
    })
    .optional(),
  gstin: z.string()
    .refine(v => !v || GSTIN_REGEX.test(v.toUpperCase().trim()), {
      message: 'Invalid GSTIN format',
    })
    .optional(),
  panNumber: z.string()
    .refine(v => !v || PAN_REGEX.test(v.toUpperCase().trim()), {
      message: 'Invalid PAN format',
    })
    .optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
}).strict(); // .strict() rejects any key not in the schema
