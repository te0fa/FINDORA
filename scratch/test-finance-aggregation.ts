import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(url, key);

// Round to 2 decimal places safely
const roundToTwo = (num: any): number => {
  const parsed = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(parsed) || parsed === null || parsed === undefined) return 0;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
};

// The original JS implementation with standard JS accumulation (floating point)
async function originalGetFinancialSummaryJS() {
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('type, amount');

  if (error || !data) {
    return { income: 0, expense: 0, profit: 0 };
  }

  let income = 0;
  let expense = 0;

  for (const t of (data as any[])) {
    if (t.type === 'INCOME') income += Number(t.amount);
    if (t.type === 'EXPENSE') expense += Number(t.amount);
  }

  return {
    income,
    expense,
    profit: income - expense
  };
}

// The new RPC implementation (mocked using direct RPC call)
async function newGetFinancialSummaryRPC() {
  const { data, error } = await supabase
    .rpc('fn_get_financial_summary');

  if (error || !data) {
    throw error || new Error('No data');
  }

  const summary = data as { income: number; expense: number; profit: number };

  return {
    income: roundToTwo(summary.income),
    expense: roundToTwo(summary.expense),
    profit: roundToTwo(summary.profit)
  };
}

async function getCategories() {
  const { data, error } = await supabase
    .from('financial_categories')
    .select('id, type');
  if (error) throw error;
  return data;
}

async function runTests() {
  console.log('--- STARTING FINANCIAL SUMMARY TESTS ---');

  // Fetch initial state and verify counts
  const { count: initialCount } = await supabase
    .from('financial_transactions')
    .select('*', { count: 'exact', head: true });
  console.log(`Initial transaction count: ${initialCount}`);

  // Fetch categories
  const categories = await getCategories();
  const incomeCategory = categories.find(c => c.type === 'INCOME')?.id;
  const expenseCategory = categories.find(c => c.type === 'EXPENSE')?.id;

  if (!incomeCategory || !expenseCategory) {
    console.error('Error: Income or Expense category not found in DB.');
    return;
  }

  // -------------------------------------------------------------
  // Test 1: Complete parity on current data (0 rows)
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Current Database Parity (0 rows) ---');
  const res1JS = await originalGetFinancialSummaryJS();
  const res1RPC = await newGetFinancialSummaryRPC();
  
  const res1JSRounded = {
    income: roundToTwo(res1JS.income),
    expense: roundToTwo(res1JS.expense),
    profit: roundToTwo(res1JS.profit)
  };
  
  console.log('JS Output (Raw):', res1JS);
  console.log('JS Output (Rounded):', res1JSRounded);
  console.log('RPC Output:', res1RPC);

  const t1Passed = JSON.stringify(res1JSRounded) === JSON.stringify(res1RPC);
  console.log(`TEST 1 Result: ${t1Passed ? 'PASS' : 'FAIL'}`);

  // -------------------------------------------------------------
  // Test 2: Decimal values matching test
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Decimal values matching test (1234.57 & 876.23) ---');
  const tempIncomeAmt = 1234.57;
  const tempExpenseAmt = 876.23;

  // Insert two temporary test rows
  const { data: insertedTxs, error: insertError } = await supabase
    .from('financial_transactions')
    .insert([
      { type: 'INCOME', category_id: incomeCategory, amount: tempIncomeAmt, description: 'TEMP_TEST_INCOME_DECIMAL' },
      { type: 'EXPENSE', category_id: expenseCategory, amount: tempExpenseAmt, description: 'TEMP_TEST_EXPENSE_DECIMAL' }
    ])
    .select();

  if (insertError) {
    console.error('Failed to insert test rows:', insertError);
    return;
  }
  console.log(`Inserted ${insertedTxs.length} test rows.`);

  const res2JS = await originalGetFinancialSummaryJS();
  const res2RPC = await newGetFinancialSummaryRPC();
  
  const res2JSRounded = {
    income: roundToTwo(res2JS.income),
    expense: roundToTwo(res2JS.expense),
    profit: roundToTwo(res2JS.profit)
  };

  console.log('JS Output (Raw):', res2JS);
  console.log('JS Output (Rounded):', res2JSRounded);
  console.log('RPC Output:', res2RPC);

  // Clean up Test 2 rows
  await supabase.from('financial_transactions').delete().like('description', 'TEMP_TEST_%');
  console.log('Cleaned up Test 2 rows.');

  // Assert perfect match up to 2 decimal places
  const t2Matched = res2JSRounded.income === res2RPC.income &&
                    res2JSRounded.expense === res2RPC.expense &&
                    res2JSRounded.profit === res2RPC.profit;
  console.log(`TEST 2 Math check (with 2 decimal precision, no rounding loss):`);
  console.log(`  Income matches: ${res2JSRounded.income} === ${res2RPC.income} (${res2JSRounded.income === res2RPC.income})`);
  console.log(`  Expense matches: ${res2JSRounded.expense} === ${res2RPC.expense} (${res2JSRounded.expense === res2RPC.expense})`);
  console.log(`  Profit matches: ${res2JSRounded.profit} === ${res2RPC.profit} (${res2JSRounded.profit === res2RPC.profit})`);
  console.log(`TEST 2 Result: ${t2Matched ? 'PASS' : 'FAIL'}`);

  // -------------------------------------------------------------
  // Test 3: Performance test with 1000 rows
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Performance test with 1000 rows ---');
  console.log('Generating 1000 test transactions...');
  const testTxs: any[] = [];
  for (let i = 0; i < 1000; i++) {
    const isIncome = i % 2 === 0;
    testTxs.push({
      type: isIncome ? 'INCOME' : 'EXPENSE',
      category_id: isIncome ? incomeCategory : expenseCategory,
      amount: isIncome ? 10.01 : 5.00,
      description: `TEMP_PERF_TEST_${i}`
    });
  }

  // Batch insert
  const { data: insertedPerfTxs, error: insertPerfError } = await supabase
    .from('financial_transactions')
    .insert(testTxs)
    .select();

  if (insertPerfError) {
    console.error('Failed to insert performance test rows:', insertPerfError);
    return;
  }
  console.log(`Inserted ${insertedPerfTxs.length} performance test rows.`);

  // Measure JS
  const startJS = performance.now();
  const res3JS = await originalGetFinancialSummaryJS();
  const endJS = performance.now();
  const durationJS = endJS - startJS;

  // Measure RPC
  const startRPC = performance.now();
  const res3RPC = await newGetFinancialSummaryRPC();
  const endRPC = performance.now();
  const durationRPC = endRPC - startRPC;

  console.log(`JS execution time: ${durationJS.toFixed(2)} ms`);
  console.log(`RPC execution time: ${durationRPC.toFixed(2)} ms`);
  console.log('JS summary results (Raw):', res3JS);
  console.log('RPC summary results:', res3RPC);

  // Clean up using LIKE pattern to avoid too many IDs url length limit
  const { error: deleteError } = await supabase.from('financial_transactions').delete().like('description', 'TEMP_PERF_TEST_%');
  if (deleteError) {
    console.error('Failed to clean up performance test rows:', deleteError);
  } else {
    console.log('Cleaned up performance test rows.');
  }

  const { count: finalCount } = await supabase
    .from('financial_transactions')
    .select('*', { count: 'exact', head: true });
  console.log(`Final transaction count: ${finalCount}`);

  const t3Passed = finalCount === initialCount;
  console.log(`TEST 3 Cleanup integrity: ${t3Passed ? 'PASS' : 'FAIL'}`);
}

runTests().catch(console.error);
