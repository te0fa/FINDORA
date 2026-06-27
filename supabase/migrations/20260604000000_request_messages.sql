-- Migration: Add request_messages for bidirectional chat
CREATE TABLE IF NOT EXISTS public.request_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'staff')),
    sender_id UUID NOT NULL, -- references auth.users (customer or staff member's auth id)
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_request_messages_request_id ON public.request_messages(request_id, created_at ASC);

-- RLS
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

-- Customers can view messages for their requests
CREATE POLICY "Customers can view their request messages"
ON public.request_messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.requests r
        JOIN public.customers c ON c.id = r.customer_id
        WHERE r.id = request_messages.request_id AND c.auth_user_id = auth.uid()
    )
);

-- Customers can insert messages for their requests
CREATE POLICY "Customers can insert messages for their requests"
ON public.request_messages FOR INSERT
TO authenticated
WITH CHECK (
    sender_type = 'customer' AND
    sender_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.requests r
        JOIN public.customers c ON c.id = r.customer_id
        WHERE r.id = request_messages.request_id AND c.auth_user_id = auth.uid()
    )
);

-- Staff can view all messages (assuming general staff access, can be restricted later)
CREATE POLICY "Staff can view all request messages"
ON public.request_messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.staff_members s
        WHERE s.auth_user_id = auth.uid()
    )
);

-- Staff can insert messages
CREATE POLICY "Staff can insert messages"
ON public.request_messages FOR INSERT
TO authenticated
WITH CHECK (
    sender_type = 'staff' AND
    sender_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.staff_members s
        WHERE s.auth_user_id = auth.uid()
    )
);

-- Allow reading/writing via admin service role
CREATE POLICY "Service role full access"
ON public.request_messages FOR ALL
USING (true)
WITH CHECK (true);
