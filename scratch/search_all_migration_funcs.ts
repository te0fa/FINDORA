import fs from 'fs'
import path from 'path'

const migrationsDir = 'e:\\FINDORA\\supabase\\migrations'
const files = fs.readdirSync(migrationsDir)

console.log('Searching all migration files for custom functions...')
for (const file of files) {
  if (file.endsWith('.sql')) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    const regex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([^\(]+)\(([^)]*)\)/gi
    let match
    let found = false
    while ((match = regex.exec(content)) !== null) {
      if (!found) {
        console.log(`\nFunctions in ${file}:`)
        found = true
      }
      console.log(`- ${match[1].trim()}(${match[2].trim().replace(/\s+/g, ' ')})`)
    }
  }
}
