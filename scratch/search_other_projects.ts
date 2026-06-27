import fs from 'fs'
import path from 'path'

function search(dir: string) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    let stat
    try {
      stat = fs.statSync(fullPath)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        search(fullPath)
      }
    } else {
      try {
        const content = fs.readFileSync(fullPath, 'utf8')
        if (content.includes('knsjvttjkbdztxmtjxpz')) {
          console.log(`Found in: ${fullPath}`)
          const lines = content.split('\n')
          lines.forEach((line, idx) => {
            if (line.includes('knsjvttjkbdztxmtjxpz')) {
              console.log(`  Line ${idx + 1}: ${line.trim()}`)
            }
          })
        }
      } catch {}
    }
  }
}

console.log('Searching in FOUNDORA...')
if (fs.existsSync('e:\\FOUNDORA')) search('e:\\FOUNDORA')
console.log('Searching in TRADEORA...')
if (fs.existsSync('e:\\TRADEORA')) search('e:\\TRADEORA')
