const mongoose = require('mongoose');
const https = require('https');

const LOG = (payload) => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6f06de1c-f1d5-4816-819f-115811990d5a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {});
  // #endregion
};

/** Parse mongodb+srv URI into components. Returns null if not srv. */
function parseSrvUri(uri) {
  const match = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]*)(\?.*)?$/);
  if (!match) return null;
  return { user: match[1], pass: match[2], srvHost: match[3], db: match[4] || 'test', query: match[5] || '' };
}

/** Resolve SRV via DNS-over-HTTPS (Cloudflare). Bypasses system DNS and UDP 53. */
async function resolveSrvViaDoH(srvHost) {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(srvHost)}&type=SRV`;
  const res = await new Promise((resolve, reject) => {
    https.get(url, { headers: { Accept: 'application/dns-json' } }, (r) => {
      let body = '';
      r.on('data', (c) => { body += c; });
      r.on('end', () => resolve({ status: r.statusCode, body }));
      r.on('error', reject);
    }).on('error', reject);
  });
  if (res.status !== 200) throw new Error(`DoH status ${res.status}`);
  const data = JSON.parse(res.body);
  const answers = data.Answer || [];
  const records = answers
    .filter((a) => a.type === 33)
    .map((a) => {
      const [priority, weight, port] = a.data.split(' ').map(Number);
      const target = a.data.replace(/^\d+\s+\d+\s+\d+\s+/, '').replace(/\.$/, '');
      return { priority, weight, port, target };
    })
    .sort((a, b) => (a.priority !== b.priority ? a.priority - b.priority : (b.weight || 0) - (a.weight || 0)));
  return records.map((r) => `${r.target}:${r.port}`);
}

/** Build mongodb:// URI from SRV results via DoH. */
async function resolveSrvToUri(uri) {
  const parsed = parseSrvUri(uri);
  if (!parsed) return null;
  const srvHost = `_mongodb._tcp.${parsed.srvHost}`;
  const hosts = await resolveSrvViaDoH(srvHost);
  if (!hosts.length) throw new Error('No SRV records');
  const auth = `${encodeURIComponent(parsed.user)}:${encodeURIComponent(parsed.pass)}`;
  const baseQ = (parsed.query || '').replace(/^\?/, '');
  const params = new URLSearchParams(baseQ);
  params.set('ssl', 'true');
  params.set('authSource', params.get('authSource') || 'admin');
  const q = '?' + params.toString();
  return `mongodb://${auth}@${hosts.join(',')}/${parsed.db}${q}`;
}

/** Resolve MONGODB_URI; if mongodb+srv, uses DoH to get plain mongodb://. */
async function getResolvedUri() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required. Add it to your .env file.');
    process.exit(1);
  }
  LOG({ location: 'db.js:getResolvedUri', message: 'URI scheme', data: { scheme: uri.startsWith('mongodb+srv://') ? 'srv' : 'plain' }, hypothesisId: 'MongoStore' });
  if (uri.startsWith('mongodb+srv://')) {
    try {
      uri = await resolveSrvToUri(uri);
      LOG({ location: 'db.js:getResolvedUri', message: 'SRV resolved via DoH', data: { hasUri: !!uri }, hypothesisId: 'MongoStore' });
    } catch (err) {
      LOG({ location: 'db.js:getResolvedUri', message: 'SRV resolve failed', data: { message: err.message }, hypothesisId: 'DoH' });
      console.error('SRV resolution failed (DNS-over-HTTPS):', err.message);
      console.error('Try using a plain mongodb:// URI in .env (get it from Atlas Connect dialog).');
      process.exit(1);
    }
  }
  return uri;
}

const connectDB = async (uri) => {
  uri = uri || await getResolvedUri();
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority',
    });
    LOG({ location: 'db.js:connectDB', message: 'mongoose.connect success', data: { host: conn.connection.host }, hypothesisId: 'MongoStore', runId: 'post-fix' });
    console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    LOG({ location: 'db.js:connectDB', message: 'mongoose.connect error', data: { message: error.message, code: error.code }, hypothesisId: 'MongoStore' });
    console.error('MongoDB connection error:', error.message);
    console.error('Check MONGODB_URI format and Atlas Network Access (whitelist your IP).');
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.getResolvedUri = getResolvedUri;
