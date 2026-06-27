# Findora Beta Runbook (Staff SOP)

This document outlines the operational procedures for Findora staff to handle sourcing requests during the Beta phase.

## 1. Intake Review Phase
When a new request arrives in the **Intake Queue**:
1. **Assign Reviewer**: Admin assigns an active staff member to the request.
2. **Review Context**: Check the request title, description, and reference image.
3. **Confirm Classification**: Ensure the `request_kind` (Everyday, High-Value, or Projects) is correct.
4. **Set Pricing Model**: Define how the customer will be charged (e.g., Fixed Fee for Everyday Purchase).
5. **Set Payment Policy**: Most beta requests should use `pay_after_preview` (Trust Model).
6. **Save Decision**: Approve the request to move it to Operations.

## 2. Operations & Sourcing Phase
Once approved, the request moves to **Operations**:
1. **Online Research**: **AI-assisted research is not active in beta unless explicitly enabled.** Staff should perform manual research and add findings manually.
2. **Field Sourcing**: For items requiring offline verification, field agents visit merchants and add "Merchant Quotes" with pricing and availability.
3. **Shortlisting**: Review all findings and quotes. Click "Add to Shortlist" for the best 3-5 options.

## 3. Report Builder & Trust Model
Before releasing to the customer:
1. **Create Snapshots**: In the "Report Preview Builder", add snapshots from the shortlist.
2. **Data Masking**: 
   - **Public Fields**: Title, Rank, Match Score, and Summary (visible to customer for free).
   - **Locked Fields**: Hidden Merchant Name, Source URL, and Contact Info (only revealed after payment).
3. **Verify Integrity**: Ensure at least one snapshot exists and has a clear value proposition.
4. **Mark Ready**: Click "Release Report to Customer". The request moves to the **Ready** queue.

## 4. Customer Release & Payment
1. **Release Now**: Finalize the report and notify the customer.
2. **Customer Unlock**: The customer views the report and clicks "Unlock" on an option they like.
3. **Payment Confirmation**:
   **Automated online payment is not active in beta.** During beta, payments are manually verified by staff through the Payments Center. Source details are unlocked only after manual confirmation.

## 5. Beta Limitations
- **No automated payment provider**: All payments must be handled via InstaPay/Bank Transfer and confirmed manually by staff.
- **No autonomous AI sourcing agent**: All research and sourcing are currently manual human-led processes.
- **Manual Payment Verification**: Staff must manually verify bank/InstaPay receipts before unlocking data.
- **Manual Report Review**: Staff must manually review and lock all reports before releasing them to customers.
- **Price/Availability**: Findora does not guarantee price availability after report delivery as market conditions change.
- **Seller Quality**: Findora does not guarantee seller or product quality; we provide the best-found sources based on research.
- **Data Locking**: Source and contact details remain strictly locked until staff confirms payment receipt.

## 6. Archive & Cleanup
- **Archive**: Terminal requests (Completed or Rejected) should be moved to the Archive to keep the queue clean.
- **Cleanup**: In the **Archive Center**, staff can permanently delete test requests or restore archived ones if needed.

## SLA & Performance
- Monitor the **SLA Badges** (On Track, At Risk, Breached) to ensure timely responses.
- Check the **Queue Performance Metrics** to identify bottlenecks in sourcing or reporting.

## First Internal Demo Checklist
To prepare for the beta, complete these 3 internal test scenarios from end-to-end:

### Scenario 1: Everyday Purchase
*Example: Customer wants a specific mobile phone, appliance, or air conditioner.*
1. Submit request from customer UI.
2. Open request in staff queue.
3. Confirm classification.
4. Set `pricing_model` and `payment_policy`.
5. Approve/move to operations.
6. Add research findings manually.
7. Add report preview snapshots.
8. Ensure hidden source fields are locked.
9. Mark report ready.
10. Open customer report and verify locked preview.
11. Create/confirm manual payment in Payments Center.
12. Unlock source details.
13. Confirm customer sees revealed source/contact info.

### Scenario 2: High-Value Deals
*Example: Used car, expensive equipment, or high-value asset.*
1. Submit request from customer UI.
2. Open request in staff queue.
3. Confirm classification.
4. Set `pricing_model` and `payment_policy`.
5. Approve/move to operations.
6. Add research findings manually.
7. Add report preview snapshots.
8. Ensure hidden source fields are locked.
9. Mark report ready.
10. Open customer report and verify locked preview.
11. Create/confirm manual payment in Payments Center.
12. Unlock source details.
13. Confirm customer sees revealed source/contact info.

### Scenario 3: Projects & Supplies
*Example: Ceramic tiles, finishing materials, or supplier sourcing.*
1. Submit request from customer UI.
2. Open request in staff queue.
3. Confirm classification.
4. Set `pricing_model` and `payment_policy`.
5. Approve/move to operations.
6. Add research findings manually.
7. Add report preview snapshots.
8. Ensure hidden source fields are locked.
9. Mark report ready.
10. Open customer report and verify locked preview.
11. Create/confirm manual payment in Payments Center.
12. Unlock source details.
13. Confirm customer sees revealed source/contact info.

## Beta Decision Gate
**Do not invite a real customer until:**
- [ ] All 3 internal demo scenarios are completed successfully.
- [ ] No blocking UI issues are found during the demo.
- [ ] Staff can complete the entire flow without developer intervention.
- [ ] Payment manual confirmation works correctly in the Payments Center.
- [ ] Source unlock works correctly for the customer.
- [ ] Both Arabic and English screens are fully localized and understandable.
- [ ] No hidden source data leaks in the browser console or DOM before payment.
