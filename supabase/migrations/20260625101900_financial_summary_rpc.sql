-- Migration to add fn_get_financial_summary RPC function for fast and accurate aggregation

CREATE OR REPLACE FUNCTION public.fn_get_financial_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_income numeric(12, 2) := 0.00;
    v_expense numeric(12, 2) := 0.00;
BEGIN
    SELECT COALESCE(SUM(amount), 0.00) INTO v_income
    FROM public.financial_transactions
    WHERE type = 'INCOME';

    SELECT COALESCE(SUM(amount), 0.00) INTO v_expense
    FROM public.financial_transactions
    WHERE type = 'EXPENSE';

    RETURN jsonb_build_object(
        'income', v_income,
        'expense', v_expense,
        'profit', v_income - v_expense
    );
END;
$$;
