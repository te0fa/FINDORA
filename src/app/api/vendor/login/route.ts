import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { verifyOtp } from '@/lib/notifications/otp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, code } = body;

    if (!phoneNumber || !code) {
      return NextResponse.json({ error: 'phoneNumber and code are required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Verify OTP via our custom phone_otp_codes system
    const otpResult = await verifyOtp(phoneNumber, code, 'vendor_auth', adminClient);
    if (!otpResult.success) {
      return NextResponse.json({ error: otpResult.error }, { status: 400 });
    }

    // 2. Fetch the vendor to ensure they exist and get their auth user status
    const { data: vendor, error: vendorErr } = await adminClient
      .from('vendors')
      .select('id, display_name, auth_user_id, system_status')
      .eq('whatsapp_number', phoneNumber)
      .maybeSingle();

    if (vendorErr || !vendor) {
      return NextResponse.json({ error: 'No registered vendor found with this phone number.' }, { status: 404 });
    }

    if (vendor.system_status === 'Suspended') {
      return NextResponse.json({ error: 'This vendor account has been suspended.' }, { status: 403 });
    }

    const email = `${phoneNumber}@vendor.findora.com`;
    const password = `${phoneNumber}_vendor_secure_2026!`;

    // 3. If vendor exists but has no auth_user_id (legacy or admin-created), create one now!
    let finalAuthUserId = vendor.auth_user_id;

    if (!finalAuthUserId) {
      // Check if user already exists in auth.users by email lookup
      const { data: usersList } = await adminClient.auth.admin.listUsers();
      const existingAuthUser = usersList?.users?.find(u => u.email === email);
      
      if (existingAuthUser) {
        finalAuthUserId = existingAuthUser.id;
      } else {
        // Create a new auth user
        const { data: newAuth, error: createAuthErr } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          phone: phoneNumber,
          phone_confirm: true,
        });

        if (createAuthErr || !newAuth.user) {
          return NextResponse.json({ error: 'Failed to create system credentials.' }, { status: 500 });
        }
        finalAuthUserId = newAuth.user.id;
      }

      // Link the auth_user_id back to vendors table
      await adminClient
        .from('vendors')
        .update({ auth_user_id: finalAuthUserId, is_phone_verified: true })
        .eq('id', vendor.id);
    }

    // 4. Sign in the user via supabase client to set cookies
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return NextResponse.json({ error: 'Login session establishment failed.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, redirectUrl: '/vendor/auctions' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
