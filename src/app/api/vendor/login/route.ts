import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    // 1. Authenticate with Supabase Auth
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: String(password),
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const authUserId = authData.user.id;

    // 2. Resolve vendor record from vendors table by auth_user_id
    const adminClient = createAdminClient();
    const { data: vendor, error: vendorErr } = await (adminClient
      .from('vendors') as any)
      .select('id, display_name, system_status, whatsapp_number')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (vendorErr || !vendor) {
      // User has valid auth credentials, but is not a registered vendor
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'No vendor profile associated with this account.' },
        { status: 403 }
      );
    }

    if (vendor.system_status === 'Suspended') {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'This vendor account has been suspended.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      redirectUrl: '/vendor/auctions',
      vendor: {
        id: vendor.id,
        displayName: vendor.display_name,
        systemStatus: vendor.system_status,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
