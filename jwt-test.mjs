import { jwtVerify } from 'jose';
const secret = new TextEncoder().encode(process.env.JWT_SECRET);
async function test(label, token) {
  try {
    await jwtVerify(token, secret, { algorithms: ['HS256'] });
    console.log(label, '-> OK');
  } catch (e) {
    console.log(label, '->', e.code, e.message);
  }
}
await test('Empty string', '');
await test('Random text', 'not-a-jwt');
await test('URL encoded', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9%2EeyJvcGVuSWQiOiJ0ZXN0In0%2Eabc');
await test('Truncated (2 parts)', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcGVuSWQiOiJ0ZXN0In0');
