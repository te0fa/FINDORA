import { createAdminClient } from '../src/lib/dal/customers'

async function audit() {
  const adminClient = await createAdminClient()
  
  const { data: boardSample } = await adminClient
    .from('v_request_admin_board')
    .select('*')
    .limit(1)

  console.log('--- v_request_admin_board Columns ---')
  if (boardSample && boardSample.length > 0) {
    console.log(Object.keys(boardSample[0]))
  } else {
    console.log('No data in v_request_admin_board')
  }

  const { data: uiStatusSample } = await adminClient
    .from('v_request_ui_status')
    .select('*')
    .limit(1)

  console.log('--- v_request_ui_status Columns ---')
  if (uiStatusSample && uiStatusSample.length > 0) {
    console.log(Object.keys(uiStatusSample[0]))
  }
}

audit().catch(console.error)
