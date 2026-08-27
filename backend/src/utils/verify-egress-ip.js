const http = require('http');
const https = require('https');
const wpay = require('../helpers/wpay');

function getPublicIp(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data.trim()));
    }).on('error', reject);
  });
}

async function verifyEgressIp() {
  console.log('==================================================');
  console.log('OUTBOUND PUBLIC EGRESS IP VERIFICATION');
  console.log('==================================================');

  // TEST 1: Public IPv4 Check 1 (ipify.org)
  let ip1 = '';
  try {
    const res1 = await getPublicIp('https://api.ipify.org?format=json');
    ip1 = JSON.parse(res1).ip;
  } catch (e) {
    ip1 = e.message;
  }
  console.log(`[TEST 1] Outbound Public IPv4 (ipify.org): ${ip1}`);

  // TEST 2: WPay Live Response Error IP
  let wpayIp = '';
  try {
    const orderId = `WPAY_TEST_${Date.now()}`;
    const res2 = await wpay.createPayIn({
      outTradeNo: orderId,
      amount: 500,
      payType: 'TRANSFER',
      attach: 'test_user',
      userName: 'TestUser',
      uid: 'test_uid',
      phone: '03001234567'
    });
    console.log('[TEST 2] WPay Success Response:', res2);
  } catch (e) {
    const match = (e.message || '').match(/Illegal IP:\s*([0-9.]+)/i);
    wpayIp = match ? match[1] : (e.message || 'unknown');
    console.log(`[TEST 2] WPay API Error Message: "${e.message}" -> Extracted IP: ${wpayIp}`);
  }

  // TEST 3: Public IPv4 Check 2 (ifconfig.me)
  let ip3 = '';
  try {
    ip3 = await getPublicIp('https://ifconfig.me/ip');
  } catch (e) {
    ip3 = e.message;
  }
  console.log(`[TEST 3] Outbound Public IPv4 (ifconfig.me): ${ip3}`);

  console.log('\n==================================================');
  console.log('IP MATCH ANALYSIS:');
  console.log(`- test 1 (ipify):    ${ip1}`);
  console.log(`- test 2 (wpay msg): ${wpayIp}`);
  console.log(`- test 3 (ifconfig): ${ip3}`);
  console.log(`- All Match:         ${(ip1 === wpayIp && wpayIp === ip3) ? 'YES' : 'NO'}`);
  console.log('==================================================');

  process.exit(0);
}

verifyEgressIp();
