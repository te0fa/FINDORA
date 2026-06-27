import fs from 'fs'
import path from 'path'

const sqlPath = 'e:\\FINDORA\\database_setup_complete.sql'
if (fs.existsSync(sqlPath)) {
  const content = fs.readFileSync(sqlPath, 'utf8')
  const regex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([^\(]+)\(([^)]*)\)/gi
  let match
  console.log('Functions in database_setup_complete.sql:')
  while ((match = regex.exec(content)) !== null) {
    console.log(`- ${match[1].trim()}(${match[2].trim().replace(/\s+/g, ' ')})`)
  }
} else {
  console.log('database_setup_complete.sql not found.')
}
