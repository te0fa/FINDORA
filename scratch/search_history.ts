import fs from 'fs'
import path from 'path'

const appData = process.env.APPDATA!
const historyPath = path.join(appData, 'Microsoft/Windows/PowerShell/PSReadLine/ConsoleHost_history.txt')

if (fs.existsSync(historyPath)) {
  const content = fs.readFileSync(historyPath, 'utf8')
  const lines = content.split('\n')
  console.log(`Searching history file (Total lines: ${lines.length})...`)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('knsjvttjkbdztxmtjxpz') || line.toLowerCase().includes('postgresql://') || line.toLowerCase().includes('postgres://')) {
      console.log(`Line ${i + 1}: ${line.trim()}`)
    }
  }
} else {
  console.log('History file not found.')
}
