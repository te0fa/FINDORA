import { submitRequest } from './actions'
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { Locale } from "@/lib/i18n/config"
import { createClient } from '@/lib/supabase/server'
import { getCustomerByAuthId } from '@/lib/dal/customers'
import PhoneVerificationCard from '../../dashboard/PhoneVerificationCard'

export default async function NewRequestPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale as Locale)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const customer = user ? await getCustomerByAuthId(user.id) : null

  return (
    <div className="max-w-2xl mx-auto animate-in">
      <div className="mb-12">
        <h1 className="mb-2 text-4xl font-black tracking-tight">{dict.new_request.title_page}</h1>
        <p className="text-lg opacity-60">{dict.new_request.desc_page}</p>
      </div>

      {customer && (
        <PhoneVerificationCard 
          customerId={customer.id}
          isPhoneVerified={!!customer.phone_verified_at}
          isFreeTrialUsed={!!customer.free_trial_used_at}
          phoneNumber={customer.phone_number_raw || ''}
          locale={locale}
        />
      )}

      <div className="card glass-card shadow-xl p-10 border border-white/10">
        <form action={submitRequest} className="space-y-10">
          
          {/* Section 1: Core Sourcing Goal */}
          <div className="space-y-6">
             <div className="pb-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center font-black">1</div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-40 m-0">Essential Details</h3>
             </div>

             <div className="form-group">
                <label htmlFor="request_kind" className="text-primary font-bold block mb-1">
                  {locale === 'ar' ? 'نوع خدمة البحث' : 'Sourcing Category'}
                </label>
                <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-semibold italic">
                  {locale === 'ar' ? 'اختر المنتجات اليومية للاستفادة من عرض الفترة التجريبية' : 'Choose Everyday Purchase to apply your free trial welcome gift'}
                </p>
                <select name="request_kind" className="premium-input w-full">
                  <option value="everyday_purchase">🛍️ {locale === 'ar' ? 'منتجات يومية (Everyday Purchase) - خصم 100% تلقائي' : 'Everyday Purchase (100% Free Trial)'}</option>
                  <option value="high_value_deals">💎 {locale === 'ar' ? 'صفقات مميزة وكبرى (High Value Deals)' : 'High Value Deals'}</option>
                  <option value="projects_supplies">🏗️ {locale === 'ar' ? 'تجهيزات مشاريع ومشتريات ضخمة (Projects Supplies)' : 'Projects Supplies'}</option>
                </select>
             </div>
             
             <div className="form-group">
                <label htmlFor="title" className="text-primary font-bold block mb-1">
                  {dict.new_request.req_title}
                </label>
                <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-semibold italic">A clear name for what you are looking for</p>
                <input
                  type="text"
                  id="title"
                  name="title"
                  placeholder={dict.new_request.req_title_placeholder}
                  required
                  className="premium-input"
                />
             </div>

             <div className="form-group">
                <label htmlFor="description" className="text-primary font-bold block mb-1">
                   {dict.new_request.req_desc}
                </label>
                <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-widest font-semibold italic">Mention color, specs, warranty, or brand preferences</p>
                 <textarea
                   id="description"
                   name="description"
                   rows={4}
                   placeholder={dict.new_request.req_desc_placeholder}
                   required
                   className="premium-input"
                   style={{ width: '100%', padding: '1.25rem', minHeight: '120px' }}
                 ></textarea>
             </div>
          </div>

          {/* Section 2: Technical Specifications & Brands */}
          <div className="space-y-6">
             <div className="pb-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center font-black">2</div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-40 m-0">Technical Preferences</h3>
             </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="form-group">
                  <label htmlFor="preferred_brands" className="text-primary font-bold block mb-1">{dict.start_request.preferred_brands}</label>
                  <input name="preferred_brands" placeholder={dict.start_request.brands_placeholder} className="premium-input" />
                </div>
                <div className="form-group">
                  <label htmlFor="preferred_models" className="text-primary font-bold block mb-1">{dict.start_request.preferred_models}</label>
                  <input name="preferred_models" placeholder={dict.start_request.models_placeholder} className="premium-input" />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="preferred_specs" className="text-primary font-bold block mb-1">{dict.start_request.preferred_specs}</label>
                <input name="preferred_specs" placeholder={dict.start_request.specs_placeholder} className="premium-input" />
              </div>

             <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="allow_alternatives" name="allow_alternatives" defaultChecked className="w-5 h-5 accent-accent" />
                <label htmlFor="allow_alternatives" className="text-sm font-semibold cursor-pointer">Allow alternative brands or models if better value is found</label>
             </div>
          </div>

          {/* Section 3: Budget & Logistics */}
          <div className="space-y-6">
             <div className="pb-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center font-black">3</div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-40 m-0">Budget & Logistics</h3>
             </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="form-group">
                  <label htmlFor="budget_min" className="text-primary font-bold block mb-1">
                    {dict.start_request.budget_min}
                  </label>
                  <input type="number" name="budget_min" placeholder={dict.start_request.budget_min_placeholder} className="premium-input" />
                </div>
                <div className="form-group">
                  <label htmlFor="budget_max" className="text-primary font-bold block mb-1">
                    {dict.start_request.budget_max}
                  </label>
                  <input type="number" name="budget_max" placeholder={dict.start_request.budget_max_placeholder} className="premium-input" />
                </div>
              </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="form-group">
                   <label htmlFor="urgency_level" className="text-primary font-bold block mb-1">Urgency</label>
                   <select name="urgency_level" className="premium-input w-full">
                     <option value="normal">Normal</option>
                     <option value="high">High (Urgent)</option>
                     <option value="low">Low (Just browsing)</option>
                   </select>
                 </div>
                 <div className="form-group">
                   <label htmlFor="priority_focus" className="text-primary font-bold block mb-1">Priority Focus</label>
                   <select name="priority_focus" className="premium-input w-full">
                     <option value="best_value">Best Value</option>
                     <option value="premium_quality">Premium Quality</option>
                     <option value="lowest_price">Lowest Price</option>
                   </select>
                 </div>
             </div>

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="delivery_needed" name="delivery_needed" defaultChecked className="w-5 h-5 accent-accent" />
                <label htmlFor="delivery_needed" className="text-sm font-semibold cursor-pointer">{dict.start_request.delivery_needed}</label>
              </div>
          </div>

          <div className="pt-8 text-center bg-white/[0.02] p-8 rounded-3xl border border-white/5">
            <button type="submit" className="shadow-2xl py-4 px-12 text-lg bg-accent hover:scale-[1.02] active:scale-[0.98] transition-all font-black rounded-xl w-full md:w-auto text-black">
              {dict.new_request.submit}
            </button>
            <p className="mt-6 text-[10px] text-white/30 uppercase tracking-[0.25em] font-bold">Your request will be routed directly to our professional sourcing agents</p>
          </div>
        </form>
      </div>
    </div>
  )
}
