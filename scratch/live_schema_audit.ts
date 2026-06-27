import { createAdminClient } from '../src/lib/dal/customers';

async function audit() {
  const adminClient = await createAdminClient();

  console.log('--- AUDIT: Foreign Keys referencing public.requests ---');
  const { data: fkRequests, error: err1 } = await adminClient.rpc('execute_sql_query', {
    sql: `
      SELECT
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          JOIN information_schema.referential_constraints AS rc
            ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_schema = 'public'
        AND ccu.table_name = 'requests';
    `
  });

  if (err1) {
    console.error('Error fetching FKs for requests:', err1);
  } else {
    console.table(fkRequests);
  }

  const childTables = (fkRequests || []).map((r: any) => r.table_name);
  const uniqueChildTables = Array.from(new Set(childTables));

  console.log('--- AUDIT: Foreign Keys referencing child tables ---');
  if (uniqueChildTables.length > 0) {
    const { data: fkChildren, error: err2 } = await adminClient.rpc('execute_sql_query', {
      sql: `
        SELECT
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            JOIN information_schema.referential_constraints AS rc
              ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_schema = 'public'
          AND ccu.table_name IN (${uniqueChildTables.map(t => `'${t}'`).join(',')});
      `
    });

    if (err2) {
      console.error('Error fetching FKs for children:', err2);
    } else {
      console.table(fkChildren);
    }
  }

  console.log('--- AUDIT: List all tables in public schema ---');
  const { data: allTables, error: err3 } = await adminClient.rpc('execute_sql_query', {
    sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
  });

  if (err3) {
    console.error('Error fetching all tables:', err3);
  } else {
    console.table(allTables);
  }
}

audit();
