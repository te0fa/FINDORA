const fs = require('fs');
const readline = require('readline');

async function run() {
    const fileStream = fs.createReadStream('C:\\Users\\mosta\\.gemini\\antigravity\\brain\\14536217-a32a-43f4-b1f9-5da6e9f4faf4\\.system_generated\\logs\\transcript.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const data = JSON.parse(line);
            if (data.tool_calls) {
                for (const call of data.tool_calls) {
                    if (call.name === 'run_command' && call.args && call.args.CommandLine) {
                        console.log(`Command: ${call.args.CommandLine}`);
                    }
                }
            }
        } catch (e) {
            // ignore
        }
    }
}

run();
