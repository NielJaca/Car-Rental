const mongoose = require('mongoose');
const https = require('https');

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
  if (uri.startsWith('mongodb+srv://')) {
    try {
      uri = await resolveSrvToUri(uri);
    } catch (err) {
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
    console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.error('Check MONGODB_URI format and Atlas Network Access (whitelist your IP).');
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.getResolvedUri = getResolvedUri;
