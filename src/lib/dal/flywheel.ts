import { createAdminClient } from './customers';

export interface FlywheelStage {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  metric_key: string;
  current_value: number;
  target_value: number;
  display_order: number;
  live_value?: number;
}

export async function getFlywheelStages(): Promise<FlywheelStage[]> {
  const client = await createAdminClient();
  const { data, error } = await client
    .from('flywheel_stages')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) throw new Error(error.message);
  
  // Calculate live values for each stage
  const stages = (data || []) as FlywheelStage[];
  
  // Fetch live stats in parallel to calculate progress percentages
  const [custCount, reqCount, merchCount, dealCount, reviewAvg] = await Promise.all([
    client.from('customers').select('*', { count: 'exact', head: true }),
    client.from('requests').select('*', { count: 'exact', head: true }),
    client.from('vendors').select('*', { count: 'exact', head: true }).eq('system_status', 'Active'),
    client.from('findora_deals').select('*', { count: 'exact', head: true }),
    client.from('vendor_reviews').select('platform_rating')
  ]);

  const totalCustomers = custCount.count || 0;
  const totalRequests = reqCount.count || 0;
  const activeMerchants = merchCount.count || 0;
  const activeDeals = dealCount.count || 0;
  
  const ratings = (reviewAvg.data || []) as Array<{ platform_rating: number }>;
  const avgRating = ratings.length > 0 
    ? ratings.reduce((sum, r) => sum + (r.platform_rating || 5), 0) / ratings.length
    : 4.8; // default to a high standard if no reviews yet
  const satisfactionPct = Math.round((avgRating / 5) * 100);

  return stages.map(stage => {
    let liveVal = stage.current_value;

    if (stage.metric_key === 'new_customers') {
      liveVal = totalCustomers;
    } else if (stage.metric_key === 'more_orders') {
      liveVal = totalRequests;
    } else if (stage.metric_key === 'more_merchants') {
      liveVal = activeMerchants;
    } else if (stage.metric_key === 'better_deals') {
      liveVal = activeDeals;
    } else if (stage.metric_key === 'better_prices') {
      // Prices are competitive based on active deals, mock progress based on activeDeals vs targets
      liveVal = Math.min(stage.target_value, Math.round((activeDeals / 10) * 100));
    } else if (stage.metric_key === 'higher_satisfaction') {
      liveVal = satisfactionPct;
    }

    return {
      ...stage,
      live_value: liveVal
    };
  });
}

export async function createFlywheelStage(input: {
  slug: string;
  name_en: string;
  name_ar: string;
  metric_key: string;
  target_value: number;
  display_order: number;
}): Promise<void> {
  const client = await createAdminClient() as any;
  const { error } = await client
    .from('flywheel_stages')
    .insert(input);

  if (error) throw new Error(error.message);
}

export async function updateFlywheelStage(
  id: string,
  input: {
    name_en?: string;
    name_ar?: string;
    current_value?: number;
    target_value?: number;
    display_order?: number;
  }
): Promise<void> {
  const client = await createAdminClient() as any;
  const { error } = await client
    .from('flywheel_stages')
    .update(input)
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function deleteFlywheelStage(id: string): Promise<void> {
  const client = await createAdminClient() as any;
  const { error } = await client
    .from('flywheel_stages')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function reorderFlywheelStages(
  updates: Array<{ id: string; display_order: number }>
): Promise<void> {
  const client = await createAdminClient() as any;
  for (const u of updates) {
    await client
      .from('flywheel_stages')
      .update({ display_order: u.display_order })
      .eq('id', u.id);
  }
}
