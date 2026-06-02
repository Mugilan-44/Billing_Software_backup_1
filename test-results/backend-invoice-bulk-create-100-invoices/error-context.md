# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: backend/invoice-bulk.spec.js >> create 100 invoices
- Location: backend/invoice-bulk.spec.js:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('div').filter({ hasText: /^Select or add a customer$/ }).nth(2)

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e5]:
    - generic [ref=e6]:
      - img "Prolync Billing" [ref=e7]
      - generic [ref=e8]:
        - generic [ref=e9]: Prolync Billing
        - generic [ref=e10]: Admin
    - navigation [ref=e11]:
      - link "Dashboard" [ref=e13] [cursor=pointer]:
        - /url: /dashboard
        - img [ref=e15]
        - generic [ref=e20]: Dashboard
      - generic [ref=e21]:
        - generic [ref=e22]: Contacts
        - link "Customers" [ref=e23] [cursor=pointer]:
          - /url: /customers
          - img [ref=e25]
          - generic [ref=e30]: Customers
        - link "Vendors" [ref=e31] [cursor=pointer]:
          - /url: /vendors
          - img [ref=e33]
          - generic [ref=e36]: Vendors
        - link "Items" [ref=e37] [cursor=pointer]:
          - /url: /items
          - img [ref=e39]
          - generic [ref=e43]: Items
      - generic [ref=e44]:
        - generic [ref=e45]: Sales
        - link "Quotations" [ref=e46] [cursor=pointer]:
          - /url: /quotations
          - img [ref=e48]
          - generic [ref=e51]: Quotations
        - link "Sales Orders" [ref=e52] [cursor=pointer]:
          - /url: /orders
          - img [ref=e54]
          - generic [ref=e58]: Sales Orders
        - link "Delivery Challans" [ref=e59] [cursor=pointer]:
          - /url: /challans
          - img [ref=e61]
          - generic [ref=e66]: Delivery Challans
        - link "Invoices" [ref=e67] [cursor=pointer]:
          - /url: /invoices
          - img [ref=e69]
          - generic [ref=e72]: Invoices
        - link "Payments" [ref=e73] [cursor=pointer]:
          - /url: /payments
          - img [ref=e75]
          - generic [ref=e77]: Payments
        - link "Credit Notes" [ref=e78] [cursor=pointer]:
          - /url: /credit-notes
          - img [ref=e80]
          - generic [ref=e83]: Credit Notes
      - generic [ref=e84]:
        - generic [ref=e85]: Purchases
        - link "Purchase Bills" [ref=e86] [cursor=pointer]:
          - /url: /purchase-bills
          - img [ref=e88]
          - generic [ref=e91]: Purchase Bills
        - link "Expenses" [ref=e92] [cursor=pointer]:
          - /url: /expenses
          - img [ref=e94]
          - generic [ref=e96]: Expenses
      - generic [ref=e97]:
        - generic [ref=e98]: Inventory
        - link "Stock" [ref=e99] [cursor=pointer]:
          - /url: /stock
          - img [ref=e101]
          - generic [ref=e104]: Stock
      - generic [ref=e105]:
        - generic [ref=e106]: Analytics
        - link "Reports" [ref=e107] [cursor=pointer]:
          - /url: /reports
          - img [ref=e109]
          - generic [ref=e111]: Reports
        - link "GST Summary" [ref=e112] [cursor=pointer]:
          - /url: /gst-summary
          - img [ref=e114]
          - generic [ref=e117]: GST Summary
      - generic [ref=e118]:
        - generic [ref=e119]: Support
        - link "Help & Support" [ref=e120] [cursor=pointer]:
          - /url: /support
          - img [ref=e122]
          - generic [ref=e129]: Help & Support
    - generic [ref=e130]:
      - generic [ref=e131]: PROLYNC v2.0
      - generic [ref=e134]: Live
  - generic [ref=e135]:
    - banner [ref=e137]:
      - generic [ref=e139]:
        - img
        - textbox "Search customers, invoices…" [ref=e140]
      - generic [ref=e141]:
        - button "Settings" [ref=e143]:
          - img [ref=e144]
        - generic [ref=e146]:
          - generic [ref=e147]:
            - generic [ref=e148]: Mugilan
            - generic [ref=e149]: Admin
          - generic [ref=e150]: M
          - button "Sign out" [ref=e151]:
            - img [ref=e152]
    - main [ref=e155]:
      - generic [ref=e157]:
        - generic [ref=e158]:
          - generic [ref=e159]:
            - heading "Invoices" [level=1] [ref=e160]
            - paragraph [ref=e161]: Create, track, and manage all billing documents.
          - link "Create Invoice" [ref=e162] [cursor=pointer]:
            - /url: /invoices/new
            - img [ref=e163]
            - text: Create Invoice
        - generic [ref=e164]:
          - generic [ref=e165]:
            - generic [ref=e166]:
              - generic:
                - img
              - textbox "Search invoice number or customer..." [ref=e167]
            - generic [ref=e168]:
              - generic [ref=e169]: "Sort:"
              - combobox [ref=e170] [cursor=pointer]:
                - option "Newest First" [selected]
                - option "Oldest First"
                - option "Amount (High-Low)"
                - option "Amount (Low-High)"
          - table [ref=e172]:
            - rowgroup [ref=e173]:
              - 'row "Date Invoice # Customer Status Amount" [ref=e174]':
                - columnheader "Date" [ref=e175]
                - 'columnheader "Invoice #" [ref=e176]'
                - columnheader "Customer" [ref=e177]
                - columnheader "Status" [ref=e178]
                - columnheader "Amount" [ref=e179]
            - rowgroup [ref=e180]:
              - 'row "6/2/2026 INV-000023 ABC Traders abc@gmail.com Draft ₹2950.00 Bal: ₹2950.00" [ref=e181] [cursor=pointer]':
                - cell "6/2/2026" [ref=e182]
                - cell "INV-000023" [ref=e183]:
                  - generic [ref=e184]: INV-000023
                - cell "ABC Traders abc@gmail.com" [ref=e185]:
                  - generic [ref=e186]: ABC Traders
                  - generic [ref=e187]: abc@gmail.com
                - cell "Draft" [ref=e188]:
                  - generic [ref=e189]: Draft
                - 'cell "₹2950.00 Bal: ₹2950.00" [ref=e190]':
                  - text: ₹2950.00
                  - generic [ref=e191]: "Bal: ₹2950.00"
              - 'row "6/1/2026 INV-000022 Prolync siva@prolync.in Partial ₹363500.00 Bal: ₹363464.00" [ref=e192] [cursor=pointer]':
                - cell "6/1/2026" [ref=e193]
                - cell "INV-000022" [ref=e194]:
                  - generic [ref=e195]: INV-000022
                - cell "Prolync siva@prolync.in" [ref=e196]:
                  - generic [ref=e197]: Prolync
                  - generic [ref=e198]: siva@prolync.in
                - cell "Partial" [ref=e199]:
                  - generic [ref=e200]: Partial
                - 'cell "₹363500.00 Bal: ₹363464.00" [ref=e201]':
                  - text: ₹363500.00
                  - generic [ref=e202]: "Bal: ₹363464.00"
              - 'row "6/1/2026 INV-000021 TESTING 1 TESTING1@GMAIL.COM Draft ₹38000.00 Bal: ₹38000.00" [ref=e203] [cursor=pointer]':
                - cell "6/1/2026" [ref=e204]
                - cell "INV-000021" [ref=e205]:
                  - generic [ref=e206]: INV-000021
                - cell "TESTING 1 TESTING1@GMAIL.COM" [ref=e207]:
                  - generic [ref=e208]: TESTING 1
                  - generic [ref=e209]: TESTING1@GMAIL.COM
                - cell "Draft" [ref=e210]:
                  - generic [ref=e211]: Draft
                - 'cell "₹38000.00 Bal: ₹38000.00" [ref=e212]':
                  - text: ₹38000.00
                  - generic [ref=e213]: "Bal: ₹38000.00"
              - 'row "6/1/2026 INV-000020 Prolync siva@prolync.in Draft ₹94400.00 Bal: ₹94400.00" [ref=e214] [cursor=pointer]':
                - cell "6/1/2026" [ref=e215]
                - cell "INV-000020" [ref=e216]:
                  - generic [ref=e217]: INV-000020
                - cell "Prolync siva@prolync.in" [ref=e218]:
                  - generic [ref=e219]: Prolync
                  - generic [ref=e220]: siva@prolync.in
                - cell "Draft" [ref=e221]:
                  - generic [ref=e222]: Draft
                - 'cell "₹94400.00 Bal: ₹94400.00" [ref=e223]':
                  - text: ₹94400.00
                  - generic [ref=e224]: "Bal: ₹94400.00"
              - row "5/29/2026 INV-000019 ABC Traders abc@gmail.com Paid ₹1330686.00" [ref=e225] [cursor=pointer]:
                - cell "5/29/2026" [ref=e226]
                - cell "INV-000019" [ref=e227]:
                  - generic [ref=e228]: INV-000019
                - cell "ABC Traders abc@gmail.com" [ref=e229]:
                  - generic [ref=e230]: ABC Traders
                  - generic [ref=e231]: abc@gmail.com
                - cell "Paid" [ref=e232]:
                  - generic [ref=e233]: Paid
                - cell "₹1330686.00" [ref=e234]
              - row "5/29/2026 INV-000017 ABC Traders abc@gmail.com Paid ₹708000.00" [ref=e235] [cursor=pointer]:
                - cell "5/29/2026" [ref=e236]
                - cell "INV-000017" [ref=e237]:
                  - generic [ref=e238]: INV-000017
                - cell "ABC Traders abc@gmail.com" [ref=e239]:
                  - generic [ref=e240]: ABC Traders
                  - generic [ref=e241]: abc@gmail.com
                - cell "Paid" [ref=e242]:
                  - generic [ref=e243]: Paid
                - cell "₹708000.00" [ref=e244]
              - row "5/29/2026 INV-000016 ABC Traders abc@gmail.com Paid ₹1031320.00" [ref=e245] [cursor=pointer]:
                - cell "5/29/2026" [ref=e246]
                - cell "INV-000016" [ref=e247]:
                  - generic [ref=e248]: INV-000016
                - cell "ABC Traders abc@gmail.com" [ref=e249]:
                  - generic [ref=e250]: ABC Traders
                  - generic [ref=e251]: abc@gmail.com
                - cell "Paid" [ref=e252]:
                  - generic [ref=e253]: Paid
                - cell "₹1031320.00" [ref=e254]
              - row "5/29/2026 INV-000013 ABC Traders abc@gmail.com Paid ₹127500.00" [ref=e255] [cursor=pointer]:
                - cell "5/29/2026" [ref=e256]
                - cell "INV-000013" [ref=e257]:
                  - generic [ref=e258]: INV-000013
                - cell "ABC Traders abc@gmail.com" [ref=e259]:
                  - generic [ref=e260]: ABC Traders
                  - generic [ref=e261]: abc@gmail.com
                - cell "Paid" [ref=e262]:
                  - generic [ref=e263]: Paid
                - cell "₹127500.00" [ref=e264]
              - row "5/29/2026 INV-000012 ABC Traders abc@gmail.com Paid ₹82750.00" [ref=e265] [cursor=pointer]:
                - cell "5/29/2026" [ref=e266]
                - cell "INV-000012" [ref=e267]:
                  - generic [ref=e268]: INV-000012
                - cell "ABC Traders abc@gmail.com" [ref=e269]:
                  - generic [ref=e270]: ABC Traders
                  - generic [ref=e271]: abc@gmail.com
                - cell "Paid" [ref=e272]:
                  - generic [ref=e273]: Paid
                - cell "₹82750.00" [ref=e274]
              - row "5/29/2026 INV-000011 ABC Traders abc@gmail.com Paid ₹50150.00" [ref=e275] [cursor=pointer]:
                - cell "5/29/2026" [ref=e276]
                - cell "INV-000011" [ref=e277]:
                  - generic [ref=e278]: INV-000011
                - cell "ABC Traders abc@gmail.com" [ref=e279]:
                  - generic [ref=e280]: ABC Traders
                  - generic [ref=e281]: abc@gmail.com
                - cell "Paid" [ref=e282]:
                  - generic [ref=e283]: Paid
                - cell "₹50150.00" [ref=e284]
```

# Test source

```ts
  1  | import { test } from '@playwright/test';
  2  | 
  3  | test('create 100 invoices', async ({ page }) => {
  4  | 
  5  |     // LOGIN ONCE
  6  |     await page.goto('https://billing-software-backup-1.vercel.app/login');
  7  | 
  8  |     await page.getByRole('textbox', { name: 'name@company.com' })
  9  |         .fill('YOUR_EMAIL');
  10 | 
  11 |     await page.getByRole('textbox', { name: '••••••••' })
  12 |         .fill('YOUR_PASSWORD');
  13 | 
  14 |     await page.getByRole('button', { name: 'Log In' }).click();
  15 | 
  16 |     await page.waitForURL('**/dashboard');
  17 | 
  18 |     for (let i = 1; i <= 100; i++) {
  19 | 
  20 |         console.log(`Creating invoice ${i}`);
  21 | 
  22 |         await page.goto(
  23 |             'https://billing-software-backup-1.vercel.app/invoices'
  24 |         );
  25 | 
  26 |         await page.locator('div')
  27 |             .filter({ hasText: /^Select or add a customer$/ })
  28 |             .nth(2)
> 29 |             .click();
     |              ^ Error: locator.click: Test timeout of 30000ms exceeded.
  30 | 
  31 |         await page.getByText('ABC Traders').click();
  32 | 
  33 |         await page.getByRole('combobox')
  34 |             .first()
  35 |             .selectOption('Net 15');
  36 | 
  37 |         await page.getByRole('cell', {
  38 |             name: 'Commission or Brokerage (2%)'
  39 |         })
  40 |             .getByRole('combobox')
  41 |             .selectOption('18');
  42 | 
  43 |         await page.locator('.relative.w-full > .flex > .lucide').click();
  44 | 
  45 |         await page.getByText('Logitech Mouse').click();
  46 | 
  47 |         await page.getByText('Include Digital/Authorized').click();
  48 | 
  49 |         await page.locator('form')
  50 |             .getByRole('button', { name: 'Save and Send' })
  51 |             .click();
  52 | 
  53 |         await page.waitForTimeout(1000);
  54 |     }
  55 | });
```