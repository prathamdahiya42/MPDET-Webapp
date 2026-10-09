let cachedPublicData = null;
let cachedEncryptedEnvelope = null;

export async function loadHostelPublicData() {
  if (cachedPublicData) return cachedPublicData;
  const res = await fetch('/data/hostel.public.json');
  if (!res.ok) throw new Error(`Failed to load public hostel data (${res.status})`);
  cachedPublicData = await res.json();
  return cachedPublicData;
}

export async function loadHostelEncryptedEnvelope() {
  if (cachedEncryptedEnvelope) return cachedEncryptedEnvelope;
  const res = await fetch('/data/hostel.private.enc.json');
  if (!res.ok) throw new Error(`Failed to load encrypted hostel payload (${res.status})`);
  cachedEncryptedEnvelope = await res.json();
  return cachedEncryptedEnvelope;
}
