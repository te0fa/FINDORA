import fs from 'fs';
import path from 'path';
import {
  generateCustomerCode,
  isCustomerCodeConflict,
  isValidCustomerCode,
  MAX_CUSTOMER_CODE_RETRIES
} from '@/lib/customers/customer-code';

describe('P2-06: Customer Code Generation & Collision Hardening', () => {
  describe('Generator Unit Tests', () => {
    it('1. Generator always produces the CUST- prefix', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateCustomerCode();
        expect(code.startsWith('CUST-')).toBe(true);
      }
    });

    it('2. Generated code has the expected new format (CUST- followed by 10 Crockford Base32 characters)', () => {
      const codeRegex = /^CUST-[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{10}$/;
      for (let i = 0; i < 100; i++) {
        const code = generateCustomerCode();
        expect(code).toMatch(codeRegex);
        expect(code.length).toBe(15); // 'CUST-' (5) + 10 = 15
      }
    });

    it('3. Generated codes do not use Math.random()', () => {
      const mathRandomSpy = jest.spyOn(Math, 'random');
      generateCustomerCode();
      expect(mathRandomSpy).not.toHaveBeenCalled();
      mathRandomSpy.mockRestore();
    });

    it('4. Generator produces collision-resistant values across large samples', () => {
      const SAMPLE_SIZE = 10000;
      const seen = new Set<string>();
      for (let i = 0; i < SAMPLE_SIZE; i++) {
        const code = generateCustomerCode();
        expect(seen.has(code)).toBe(false);
        seen.add(code);
      }
      expect(seen.size).toBe(SAMPLE_SIZE);
    });
  });

  describe('Conflict Identification (isCustomerCodeConflict)', () => {
    it('6. customer_code duplicate (23505) is correctly identified as a collision', () => {
      const errWithConstraint = {
        code: '23505',
        message: 'duplicate key value violates unique constraint "customers_customer_code_key"',
        details: 'Key (customer_code)=(CUST-7K9M2P4X8W) already exists.'
      };
      expect(isCustomerCodeConflict(errWithConstraint)).toBe(true);

      const errWithColumnInDetails = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
        details: 'Key (customer_code)=(CUST-1234) already exists.'
      };
      expect(isCustomerCodeConflict(errWithColumnInDetails)).toBe(true);
    });

    it('7. phone_number_normalized duplicate is NOT incorrectly treated as a customer_code collision', () => {
      const phoneConflict = {
        code: '23505',
        message: 'duplicate key value violates unique constraint "ux_customers_phone_number_normalized"',
        details: 'Key (phone_number_normalized)=(+201000000000) already exists.'
      };
      expect(isCustomerCodeConflict(phoneConflict)).toBe(false);

      const authIdConflict = {
        code: '23505',
        message: 'duplicate key value violates unique constraint "ux_customers_auth_user_id_not_null"',
        details: 'Key (auth_user_id)=(00000000-0000-0000-0000-000000000000) already exists.'
      };
      expect(isCustomerCodeConflict(authIdConflict)).toBe(false);

      const non23505 = {
        code: '23503',
        message: 'foreign key constraint violation',
        details: 'customer_code'
      };
      expect(isCustomerCodeConflict(non23505)).toBe(false);

      expect(isCustomerCodeConflict(null)).toBe(false);
      expect(isCustomerCodeConflict(undefined)).toBe(false);
      expect(isCustomerCodeConflict('string error')).toBe(false);
    });
  });

  describe('Consumer Static Audit & Shared Generator Usage', () => {
    it('5. All three customer creation paths use the shared generator and eliminate Math.random()', () => {
      const dalPath = path.resolve(__dirname, '../../../src/lib/dal/customers.ts');
      const actionsPath = path.resolve(__dirname, '../../../src/app/[locale]/auth/actions.ts');

      const dalSource = fs.readFileSync(dalPath, 'utf8');
      const actionsSource = fs.readFileSync(actionsPath, 'utf8');

      // Check imports
      expect(dalSource).toContain("from '@/lib/customers/customer-code'");
      expect(actionsSource).toContain("from '@/lib/customers/customer-code'");

      // Check that Math.random is NOT used in customers.ts
      expect(dalSource).not.toContain('Math.random()');

      // Check that actions.ts does not use Math.random for customer codes
      expect(actionsSource).not.toContain('customer_code: `CUST-${Math.floor');
      expect(actionsSource).not.toContain('const customerCode = `CUST-${Math.floor');

      // Check shared function call
      expect(dalSource).toContain('generateCustomerCode()');
      expect(actionsSource).toContain('generateCustomerCode()');

      // Check retry bounded logic
      expect(dalSource).toContain('isCustomerCodeConflict(');
      expect(actionsSource).toContain('isCustomerCodeConflict(');
      expect(dalSource).toContain('MAX_CUSTOMER_CODE_RETRIES');
      expect(actionsSource).toContain('MAX_CUSTOMER_CODE_RETRIES');
    });
  });

  describe('Validation & Backward Compatibility', () => {
    it('10. Validation accepts both modern and historical/test formats', () => {
      // Modern format
      expect(isValidCustomerCode('CUST-7K9M2P4X8W')).toBe(true);
      expect(isValidCustomerCode('CUST-0123456789')).toBe(true);

      // Historical 4-digit format
      expect(isValidCustomerCode('CUST-1000')).toBe(true);
      expect(isValidCustomerCode('CUST-9999')).toBe(true);
      expect(isValidCustomerCode('CUST-4644')).toBe(true);

      // Test/Synthetic format
      expect(isValidCustomerCode('CUST-E2E-LEGACY')).toBe(true);
      expect(isValidCustomerCode('CUST-B4-001')).toBe(true);

      // Invalid formats
      expect(isValidCustomerCode('INVALID-1234')).toBe(false);
      expect(isValidCustomerCode('CUST-')).toBe(false);
      expect(isValidCustomerCode('CUST-1')).toBe(false);
      expect(isValidCustomerCode(null)).toBe(false);
      expect(isValidCustomerCode(undefined)).toBe(false);
      expect(isValidCustomerCode(12345)).toBe(false);
    });

    it('11. MAX_CUSTOMER_CODE_RETRIES is set to a safe bounded value', () => {
      expect(MAX_CUSTOMER_CODE_RETRIES).toBe(3);
    });
  });

  describe('Creation Path Retry Logic Simulations', () => {
    it('8. Bounded retry succeeds when an initial customer_code collision occurs', async () => {
      let attempts = 0;
      const codesGenerated: string[] = [];

      const mockDbInsert = async () => {
        attempts++;
        const code = generateCustomerCode();
        codesGenerated.push(code);

        if (attempts === 1) {
          // Simulate collision on first attempt
          return {
            data: null,
            error: {
              code: '23505',
              message: 'duplicate key value violates unique constraint "customers_customer_code_key"',
              details: `Key (customer_code)=(${code}) already exists.`
            }
          };
        }

        // Succeed on second attempt
        return {
          data: { id: 'test-cust-id', customer_code: code },
          error: null
        };
      };

      // Emulate retry loop
      let result = null;
      for (let attempt = 1; attempt <= MAX_CUSTOMER_CODE_RETRIES; attempt++) {
        const { data, error } = await mockDbInsert();
        if (!error) {
          result = data;
          break;
        }
        if (isCustomerCodeConflict(error)) {
          continue;
        }
        break;
      }

      expect(attempts).toBe(2);
      expect(result).not.toBeNull();
      expect(result?.customer_code).toBe(codesGenerated[1]);
      expect(codesGenerated[0]).not.toBe(codesGenerated[1]);
    });

    it('9. Retry exhaustion terminates after bounded attempts and fails cleanly', async () => {
      let attempts = 0;

      const mockAlwaysCollides = async () => {
        attempts++;
        const code = generateCustomerCode();
        return {
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "customers_customer_code_key"',
            details: `Key (customer_code)=(${code}) already exists.`
          }
        };
      };

      let result = null;
      let exhausted = false;

      for (let attempt = 1; attempt <= MAX_CUSTOMER_CODE_RETRIES; attempt++) {
        const { data, error } = await mockAlwaysCollides();
        if (!error) {
          result = data;
          break;
        }
        if (isCustomerCodeConflict(error)) {
          continue;
        }
        break;
      }

      if (!result) {
        exhausted = true;
      }

      expect(attempts).toBe(MAX_CUSTOMER_CODE_RETRIES);
      expect(result).toBeNull();
      expect(exhausted).toBe(true);
    });
  });
});
