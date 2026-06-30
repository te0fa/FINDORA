import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const contributorId = formData.get('contributorId') as string;
    const fileType = formData.get('fileType') as string; // 'front' | 'back' | 'selfie'

    if (!file || !contributorId || !fileType) {
      return NextResponse.json({ error: 'file, contributorId, and fileType are required' }, { status: 400 });
    }

    const validTypes = ['front', 'back', 'selfie'];
    if (!validTypes.includes(fileType)) {
      return NextResponse.json({ error: 'Invalid fileType' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const db = createAdminClient();

    // Verify contributor exists
    const { data: contributor } = await (db as any).from('contributors')
      .select('id')
      .eq('id', contributorId)
      .maybeSingle();

    if (!contributor) {
      return NextResponse.json({ error: 'Contributor not found' }, { status: 404 });
    }

    // Build storage path: kyc-documents/{contributorId}/{fileType}_{timestamp}.{ext}
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const storagePath = `${contributorId}/${fileType}_${timestamp}.${ext}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await db.storage
      .from('kyc-documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true, // Overwrite if re-uploading same type
      });

    if (uploadError) {
      // log.error('[KYC UPLOAD]', uploadError);
      // If bucket doesn't exist yet, return helpful error
      if (uploadError.message?.includes('bucket')) {
        return NextResponse.json({
          error: 'Storage bucket not configured. Please create "kyc-documents" bucket in Supabase Dashboard.',
        }, { status: 500 });
      }
      return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      path: storagePath,
      fullPath: uploadData?.fullPath,
    });

  } catch (err: any) {
    // log.error('[KYC UPLOAD]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
