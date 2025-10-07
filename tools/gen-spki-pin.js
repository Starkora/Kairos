#!/usr/bin/env node
const tls = require('tls');
const crypto = require('crypto');

const host = process.argv[2];
const port = Number(process.argv[3] || 443);
if (!host) {
  console.error('Uso: node tools/gen-spki-pin.js <host> [port]');
  process.exit(1);
}

function derToPem(der) {
  const b64 = der.toString('base64');
  const wrapped = b64.match(/.{1,64}/g).join('\n');
  return `-----BEGIN CERTIFICATE-----\n${wrapped}\n-----END CERTIFICATE-----\n`;
}

function getSpkiHashFromPemCert(certPem) {
  const pub = crypto.createPublicKey(certPem);
  const spkiDer = pub.export({ type: 'spki', format: 'der' });
  const hash = crypto.createHash('sha256').update(spkiDer).digest('base64');
  return hash;
}

const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false }, () => {
  try {
    const cert = socket.getPeerCertificate(true);
    if (!cert || !cert.raw) {
      throw new Error('No se obtuvo el certificado del servidor');
    }
    const pem = derToPem(cert.raw);
    const spki = getSpkiHashFromPemCert(pem);
    console.log(JSON.stringify({ host, port, spkiBase64: spki }, null, 2));
  } catch (e) {
    console.error('Error generando SPKI:', e && (e.stack || e.message || e));
    process.exitCode = 2;
  } finally {
    socket.end();
  }
});

socket.on('error', (err) => {
  console.error('Error TLS:', err && (err.stack || err.message || err));
  process.exitCode = 3;
});
