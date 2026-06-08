import { roundMoney, Decimal } from './rounding.js';

/**
 * Master calculation function for billing engine
 * @param {Object} input - { lineItems, discountPercent, discountFixed, companyStateCode, customerStateCode, shippingCharge }
 */
export const calculateInvoice = (input) => {
    const { 
        lineItems = [], 
        discountPercent = 0, 
        discountFixed = 0,
        companyStateCode = null, 
        customerStateCode = null,
        shippingCharge = 0,
        taxType = 'GST',
        taxRate = null,
        isTaxed = true,
        tdsTcsType = 'None',
        tdsPercentage = 0,
        tcsPercentage = 0
    } = input;

    let subtotal = new Decimal(0);
    let lineDiscountsSum = new Decimal(0);

    // Determine the tax percentage to apply to each line
    const getTaxPercent = (item) => {
        if (!isTaxed || taxType === 'None') return new Decimal(0);
        if (taxRate !== null && taxRate !== undefined && taxRate !== '') return new Decimal(taxRate);
        return new Decimal(item.gstPercentage || item.gstPercent || 0);
    };

    // 1. subtotal = sum(line_items.price * line_items.quantity)
    const computedItems = lineItems.map(item => {
        const qty = new Decimal(item.quantity || 0);
        const rate = new Decimal(item.rate || item.price || 0);
        const gstPct = getTaxPercent(item);
        
        const lineTotalBeforeDiscount = qty.times(rate);
        
        let discountAmt = new Decimal(0);
        const dType = item.discountType || '%';
        const dVal = new Decimal(item.discountValue || item.discount || item.discountPercent || 0);
        
        if (dType === '%' || dType === 'percentage') {
            discountAmt = roundMoney(lineTotalBeforeDiscount.times(dVal.div(100)));
        } else {
            discountAmt = dVal;
        }
        
        if (discountAmt.gt(lineTotalBeforeDiscount)) {
            discountAmt = lineTotalBeforeDiscount;
        }

        const lineTotal = roundMoney(lineTotalBeforeDiscount.minus(discountAmt));
        subtotal = subtotal.plus(lineTotalBeforeDiscount); // subtotal is undiscounted
        lineDiscountsSum = lineDiscountsSum.plus(discountAmt);

        return {
            ...item,
            quantity: qty.toNumber(),
            rate: rate.toNumber(),
            discountPercent: (dType === '%') ? dVal.toNumber() : 0,
            discountValue: dVal.toNumber(),
            discountType: dType,
            discountAmount: discountAmt.toNumber(),
            gstPercentage: gstPct.toNumber(),
            gstPercent: gstPct.toNumber(), // sync duplicate alias
            lineTotal: lineTotal.toNumber(),
            amount: lineTotal.toNumber(), // Mongoose schema expects 'amount'
        };
    });

    // 2. discount_amount = apply_discount(subtotal_after_line_discounts, discount_percent_or_fixed)
    const subtotalAfterLineDiscounts = subtotal.minus(lineDiscountsSum);
    let invoiceDiscountAmount = new Decimal(0);
    if (discountPercent > 0) {
        invoiceDiscountAmount = roundMoney(subtotalAfterLineDiscounts.times(new Decimal(discountPercent).div(100)));
    } else if (discountFixed > 0) {
        invoiceDiscountAmount = new Decimal(discountFixed);
    }
    // Ensure discount doesn't exceed subtotal
    if (invoiceDiscountAmount.gt(subtotalAfterLineDiscounts)) {
        invoiceDiscountAmount = subtotalAfterLineDiscounts;
    }

    const totalDiscountAmount = lineDiscountsSum.plus(invoiceDiscountAmount);

    // 3. taxable_value = subtotal - totalDiscountAmount
    const invoiceTaxableValue = subtotal.minus(totalDiscountAmount);

    // 4. tax_amount = sum(taxable_value * tax_rate / 100 for each tax line)
    let totalTaxAmount = new Decimal(0);
    let totalCgst = new Decimal(0);
    let totalSgst = new Decimal(0);
    let totalIgst = new Decimal(0);

    const isSameState = (companyStateCode && customerStateCode) 
        ? String(companyStateCode).trim() === String(customerStateCode).trim() 
        : true; // Default to intra-state if missing

    // Apportioning factor
    const apportionFactor = subtotal.isZero() ? new Decimal(0) : invoiceTaxableValue.div(subtotal);

    const finalizedItems = computedItems.map(item => {
        const lineTotalBeforeDiscount = new Decimal(item.quantity).times(item.rate);

        // Apportioned taxable value for this line
        const taxableValue = roundMoney(lineTotalBeforeDiscount.times(apportionFactor));
        const taxAmount = roundMoney(taxableValue.times(new Decimal(item.gstPercentage)).div(100));

        totalTaxAmount = totalTaxAmount.plus(taxAmount);

        let cgst = new Decimal(0);
        let sgst = new Decimal(0);
        let igst = new Decimal(0);

        if (isTaxed && taxType === 'GST') {
            if (isSameState) {
                cgst = roundMoney(taxAmount.div(2));
                sgst = taxAmount.minus(cgst); // ensures cgst+sgst exactly equals taxAmount
                totalCgst = totalCgst.plus(cgst);
                totalSgst = totalSgst.plus(sgst);
            } else {
                igst = taxAmount;
                totalIgst = totalIgst.plus(igst);
            }
        } else if (isTaxed && (taxType === 'VAT' || taxType === 'Sales Tax')) {
            igst = taxAmount;
            totalIgst = totalIgst.plus(igst);
        }

        return {
            ...item,
            taxableValue: taxableValue.toNumber(),
            taxAmount: taxAmount.toNumber(),
            cgst: cgst.toNumber(),
            sgst: sgst.toNumber(),
            igst: igst.toNumber()
        };
    });

    // 5. shipping_charge = shipping_amount
    const finalShipping = new Decimal(shippingCharge || 0);

    // 6. TDS / TCS calculation
    let tdsAmount = new Decimal(0);
    let tcsAmount = new Decimal(0);
    if (tdsTcsType === 'TDS') {
        tdsAmount = roundMoney(invoiceTaxableValue.times(new Decimal(tdsPercentage || 0).div(100)));
    } else if (tdsTcsType === 'TCS') {
        tcsAmount = roundMoney(invoiceTaxableValue.times(new Decimal(tcsPercentage || 0).div(100)));
    }

    // 7. grand_total = taxable_value + tax_amount + shipping_charge - tds_amount + tcs_amount
    const grandTotal = invoiceTaxableValue.plus(totalTaxAmount).plus(finalShipping).minus(tdsAmount).plus(tcsAmount);

    return {
        lineItems: finalizedItems,
        subtotal: subtotal,
        discountAmount: totalDiscountAmount,
        taxableAmount: invoiceTaxableValue, // Alias for DB consistency
        taxAmount: totalTaxAmount,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        shippingCharge: finalShipping,
        tdsAmount: tdsAmount,
        tcsAmount: tcsAmount,
        grandTotal: grandTotal,
        isSameState: isSameState
    };
};
