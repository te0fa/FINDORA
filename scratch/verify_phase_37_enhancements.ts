import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { generateAcceptanceToken, verifyAcceptanceToken } from '../src/lib/dal/staff';
import { sendOutboundSMS } from '../src/lib/dal/communications';
import { adjustWalletBalance } from '../src/lib/staff/finance';
import { createAdminClient } from '../src/lib/dal/customers';

async function testTaskAcceptanceToken() {
  console.log('--- Test 1: Task Acceptance Token ---');
  const mockReqId = '3458ba5d-1111-4444-9999-555555555555';
  const mockStaffId = '11111111-2222-3333-4444-555555555555';

  const token = generateAcceptanceToken(mockReqId, mockStaffId);
  console.log(`Generated Token: ${token}`);

  const verified = verifyAcceptanceToken(token);
  if (verified && verified.requestId === mockReqId && verified.reviewerStaffId === mockStaffId) {
    console.log('✅ Token signed and verified successfully!');
  } else {
    console.error('❌ Token verification failed!', verified);
  }
}

async function testSmsGatewaySimulation() {
  console.log('\n--- Test 2: SMS Gateway Simulation ---');
  const res = await sendOutboundSMS('+201012345678', 'Hello Findora customer! Your report is ready.');
  if (res && res.success && res.provider === 'simulation') {
    console.log('✅ SMS Simulation output validated successfully!');
  } else {
    console.warn('⚠️ SMS check result (could be actual Twilio/SMS-Misr if credentials present):', res);
  }
}

async function testWalletAdjustmentLocalDb() {
  console.log('\n--- Test 3: Wallet Adjustment ---');
  // Check if we can find a wallet to test with
  const db = await createAdminClient();
  const { data: wallets } = await db.from('contributor_wallets').select('id, contributor_id').limit(1);
  
  if (wallets && wallets.length > 0) {
    const targetWallet = wallets[0];
    console.log(`Target wallet for test: ${targetWallet.id}`);
    
    // Test adjustment
    const res = await adjustWalletBalance(
      targetWallet.id,
      10, // EGP
      5,  // points
      'manual_adjustment',
      'Test adjustment EN',
      'تعديل تجريبي AR',
      '11111111-2222-3333-4444-555555555555' // mock reviewer
    );

    if (res.success) {
      console.log('✅ Wallet adjustment completed successfully!');
    } else {
      console.error('❌ Wallet adjustment failed:', res.error);
    }
  } else {
    console.log('⚠️ No wallets found in database to run live adjustment test.');
  }
}

async function runAll() {
  await testTaskAcceptanceToken();
  await testSmsGatewaySimulation();
  await testWalletAdjustmentLocalDb();
}

runAll().catch(err => {
  console.error('Test script crashed:', err);
});
