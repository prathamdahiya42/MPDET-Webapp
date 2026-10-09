import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { cleanHostelDataset } from './hostel-clean.mjs';

// Load .env
dotenv.config();

const HOSTEL_FILE = path.resolve('private', 'HostelData.xlsx');
const MERIT_FILE = path.resolve('public', 'CommonView.xlsx');
const PUBLIC_OUTPUT_DIR = path.resolve('public', 'data');
const PUBLIC_JSON_FILE = path.join(PUBLIC_OUTPUT_DIR, 'hostel.public.json');
const PRIVATE_ENC_FILE = path.join(PUBLIC_OUTPUT_DIR, 'hostel.private.enc.json');

// If running in CI/Vercel deploy environment where private/HostelData.xlsx is git-ignored,
// rely on pre-built public and encrypted datasets rather than failing or generating fake data.
if (!fs.existsSync(HOSTEL_FILE) && fs.existsSync(PUBLIC_JSON_FILE) && fs.existsSync(PRIVATE_ENC_FILE)) {
  console.log('ℹ️ private/HostelData.xlsx not present in build environment.');
  console.log('✅ Using pre-built encrypted hostel datasets in public/data/.');
  process.exit(0);
}

const password = process.env.HOSTEL_PASSWORD;
const maskNames = process.env.HOSTEL_MASK_NAMES !== 'false';

if (!password || password.trim().length < 12) {
  console.error('\x1b[31m[ERROR] HOSTEL_PASSWORD is missing or shorter than 12 characters in .env.\x1b[0m');
  console.error('Please configure HOSTEL_PASSWORD in .env with a strong secret (at least 12 characters).');
  process.exit(1);
}

console.log('🔄 Cleaning and validating hostel dataset...');
const { records, reports, reportPath } = cleanHostelDataset(HOSTEL_FILE, MERIT_FILE);
console.log(`✅ Cleaned ${records.length} records. Cleaning report saved to: ${reportPath}`);

// 1. Prepare Public Data
const publicRecords = records.map(r => {
  const pub = {
    id: r.id,
    course: r.course,
    branch: r.branch,
    category: r.category,
    air: r.air,
    room: r.room,
    block: r.block,
    roomNo: r.roomNo,
    college: r.college,
    jkResident: r.jkResident,
    roommateIds: r.roommateIds,
    meritKey: r.meritKey,
    maskedName: r.maskedName,
    publicFlags: r.flags.filter(f => f === 'ROOM_SINGLE')
  };
  if (!maskNames) {
    pub.name = r.fullName;
  }
  return pub;
});

// 2. Prepare Private Plaintext Records
const privateMap = {};
records.forEach(r => {
  privateMap[r.id] = {
    fullName: r.fullName,
    nameEn: r.nameEn,
    studentMobile: r.studentMobile,
    altStudentMobile: r.altStudentMobile,
    fatherName: r.fatherName,
    fatherMobile: r.fatherMobile,
    altFatherMobile: r.altFatherMobile,
    note: r.note
  };
});

const plaintextPayload = JSON.stringify({ records: privateMap });

// 3. Encrypt with AES-256-GCM + PBKDF2-SHA256 (600,000 iterations)
console.log('🔒 Encrypting private dataset with AES-256-GCM (PBKDF2 600,000 iter)...');
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const ITERATIONS = 600000;
const AAD_STRING = 'mpdet-hostel-v1';

const derivedKey = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');

const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
cipher.setAAD(Buffer.from(AAD_STRING, 'utf8'));

const ciphertext = Buffer.concat([cipher.update(plaintextPayload, 'utf8'), cipher.final()]);
const authTag = cipher.getAuthTag();

// Concat ciphertext + 16-byte authTag to match Web Crypto AES-GCM expectation
const combinedCiphertextWithTag = Buffer.concat([ciphertext, authTag]);

const encryptedEnvelope = {
  v: 1,
  kdf: 'PBKDF2-SHA256',
  iter: ITERATIONS,
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  ct: combinedCiphertextWithTag.toString('base64'),
  aad: AAD_STRING
};

// Ensure output directory exists
fs.mkdirSync(PUBLIC_OUTPUT_DIR, { recursive: true });

// Write output files
fs.writeFileSync(PUBLIC_JSON_FILE, JSON.stringify(publicRecords, null, 2), 'utf8');
fs.writeFileSync(PRIVATE_ENC_FILE, JSON.stringify(encryptedEnvelope, null, 2), 'utf8');

console.log(`✅ Public safe dataset: ${PUBLIC_JSON_FILE} (${(fs.statSync(PUBLIC_JSON_FILE).size / 1024).toFixed(1)} KB)`);
console.log(`✅ Encrypted private blob: ${PRIVATE_ENC_FILE} (${(fs.statSync(PRIVATE_ENC_FILE).size / 1024).toFixed(1)} KB)`);

// Output Summary Table to Console
console.log('\n📊 === BUILD SUMMARY ===');
console.log(`Total students processed: ${records.length}`);
console.log(`B.Tech: ${records.filter(r => r.course === 'B.TECH').length} | Polytechnic: ${records.filter(r => r.course === 'POLYTECHNIC DIPLOMA').length} | MCA: ${records.filter(r => r.course === 'MCA').length}`);
console.log(`Linked with CommonView merit list: ${records.filter(r => r.meritKey).length}`);
console.log(`Unmatched B.Tech merit links: ${records.filter(r => r.course === 'B.TECH' && !r.meritKey).length}`);

const flagCounts = {};
reports.forEach(r => { flagCounts[r.flag] = (flagCounts[r.flag] || 0) + 1; });
console.log('Flags breakdown:', flagCounts);
console.log('========================\n');
