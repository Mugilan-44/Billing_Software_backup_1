/**
 * vendor.validators.js
 * Strict Zod validation for Vendor create/update.
 * Prevents attackers from overwriting financial fields via API.
 */
import { z } from 'zod';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX   = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const addressSchema = z.object({
  street1:  z.string().optional(),
  street2:  z.string().optional(),
  city:     z.string().optional(),
  state:    z.string().optional(),
  zipCode:  z.string().optional(),
  country:  z.string().default('India'),
}).optional();

export const createVendorSchema = z.object({
  companyName:    z.string().min(1, 'Vendor/Company name is required').trim(),
  displayName:    z.string().trim().optional(),
  name:           z.string().trim().optional(),
  vendorType:     z.enum(['Business', 'Individual']).default('Business').optional(),
  email:          z.string().email('Invalid email').optional().or(z.literal('')),
  phone:          z.string().optional(),
  mobile:         z.string().optional(),
  workPhone:      z.string().optional(),
  contactPerson:  z.string().optional(),
  currency:       z.string().default('INR'),
  paymentTerms:   z.string().optional(),
  creditPeriod:   z.number().min(0).max(365).default(0),
  openingBalance: z.number().min(0).default(0),
  stateCode:      z.string().max(2).optional(),
  address:        z.string().optional(),
  billingAddress: addressSchema,
  gstNumber: z.string()
    .refine(v => !v || GSTIN_REGEX.test(v.toUpperCase().trim()), {
      message: 'Invalid GSTIN format. Expected: 22AAAAA0000A1Z5',
    }).optional(),
  gstin: z.string()
    .refine(v => !v || GSTIN_REGEX.test(v.toUpperCase().trim()), {
      message: 'Invalid GSTIN format. Expected: 22AAAAA0000A1Z5',
    }).optional(),
  panNumber: z.string()
    .refine(v => !v || PAN_REGEX.test(v.toUpperCase().trim()), {
      message: 'Invalid PAN format. Expected: AAAAA0000A',
    }).optional(),
  bankDetails: z.object({
    accountName:   z.string().optional(),
    accountNumber: z.string().optional(),
    bankName:      z.string().optional(),
    ifscCode:      z.string().optional(),
    branch:        z.string().optional(),
  }).optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
});

/**
 * Strict allowlist for vendor updates.
 * Financial fields (outstandingBalance, totalBusiness, openingBalance) are EXCLUDED.
 */
export const updateVendorSchema = z.object({
  companyName:    z.string().min(1).trim().optional(),
  displayName:    z.string().trim().optional(),
  name:           z.string().trim().optional(),
  email:          z.string().email().optional().or(z.literal('')),
  phone:          z.string().optional(),
  mobile:         z.string().optional(),
  workPhone:      z.string().optional(),
  contactPerson:  z.string().optional(),
  currency:       z.string().optional(),
  paymentTerms:   z.string().optional(),
  creditPeriod:   z.number().min(0).max(365).optional(),
  stateCode:      z.string().max(2).optional(),
  address:        z.string().optional(),
  billingAddress: addressSchema,
  gstNumber: z.string()
    .refine(v => !v || GSTIN_REGEX.test(v.toUpperCase().trim()), {
      message: 'Invalid GSTIN format',
    }).optional(),
  gstin: z.string()
    .refine(v => !v || GSTIN_REGEX.test(v.toUpperCase().trim()), {
      message: 'Invalid GSTIN format',
    }).optional(),
  panNumber: z.string()
    .refine(v => !v || PAN_REGEX.test(v.toUpperCase().trim()), {
      message: 'Invalid PAN format',
    }).optional(),
  bankDetails: z.object({
    accountName:   z.string().optional(),
    accountNumber: z.string().optional(),
    bankName:      z.string().optional(),
    ifscCode:      z.string().optional(),
    branch:        z.string().optional(),
  }).optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
}).strict();
