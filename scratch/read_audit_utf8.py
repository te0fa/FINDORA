import os

files = ['scratch/db_audit.txt', 'scratch/proof_output.txt']

for file in files:
    if os.path.exists(file):
        print(f"=== Reading {file} ===")
        with open(file, 'r', encoding='utf-16le', errors='ignore') as f:
            content = f.read()
            for line in content.split('\n'):
                if any(x in line.lower() for x in ['password', 'postgresql://', 'postgres:', 'db.knsjvttjkbdztxmtjxpz']):
                    print(line.strip())
