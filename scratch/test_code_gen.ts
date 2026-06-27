
import crypto from 'node:crypto';

const code = `REQ-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
console.log('Generated Code:', code);
console.log('Length:', code.length);
