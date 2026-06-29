import * as XLSX from 'xlsx';

export async function loadMeritData() {
  const res = await fetch('/CommonView.xlsx');
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const data = [];
  for (let i = 5; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[3]) continue;
    data.push({
      rank: r[0],
      jeeRank: r[1],
      rollNo: String(r[2]).trim(),
      name: String(r[3]).trim().replace(/\n/g, ' '),
      domicile: String(r[4]).trim(),
      category: String(r[5]).trim().replace(/\n/g, ''),
      class: String(r[6]).trim(),
      gender: String(r[7]).trim(),
      jkResident: String(r[8]).trim(),
      jkMigrant: String(r[9]).trim(),
      feeWaiver: String(r[10]).trim(),
      nationalPlayer: String(r[11]).trim(),
      ews: String(r[12]).trim(),
      ntp: String(r[13]).trim(),
      subjectGroup: String(r[14]).trim()
    });
  }
  return data;
}

export function searchStudents(data, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return data.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.rollNo.includes(q) ||
    s.rollNo.replace(/\D/g, '').includes(q)
  );
}

export async function loadCutoffData() {
  const res = await fetch('/CLGDATA.xlsx');
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const data = [];
  for (let i = 5; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[1] || !r[4]) continue;
    const name = String(r[1]).trim();
    if (!name || name === 'INSTITUTE NAME') continue;
    data.push({
      instituteName: name,
      instituteType: String(r[2]).trim().toUpperCase(),
      fw: String(r[3]).trim(),
      branch: String(r[4]).trim(),
      openingRank: r[6],
      closingRank: r[7],
      allottedCategory: String(r[8]).trim(),
      domicile: r[9] ? String(r[9]).trim() : '',
      totalAllotted: r[10] || 0
    });
  }
  return data;
}

export function getStudentCategories(student) {
  const cats = [student.category];
  if (student.ews === 'Y' && !cats.includes('EWS')) cats.push('EWS');
  return cats;
}

export function matchesCutoff(student, cutoff) {
  const cat = cutoff.allottedCategory;
  const mainCat = cat.split('/')[0];
  const suffix = cat.includes('/') ? '/' + cat.split('/').slice(1).join('/') : '';
  const isTFWSeat = cutoff.fw === 'Y' || mainCat === 'FW' || suffix.includes('F');
  const isGeneralPool = !isTFWSeat && suffix.includes('OP');
  const studentIsTFW = student.feeWaiver === 'Y';

  if (isTFWSeat && !studentIsTFW) return false;
  if (!isTFWSeat && studentIsTFW) {
    if (isGeneralPool) return false;
    if (!suffix.includes('F') && mainCat !== 'FW') return false;
  }

  if (mainCat === 'FW') return studentIsTFW;

  const studentCats = getStudentCategories(student);
  return studentCats.some(sc => sc === mainCat);
}

export const branchFullNames = {
  'AG': 'Agriculture Engineering',
  'AGE': 'Agriculture Engineering',
  'AGRITECH': 'Agriculture Technology',
  'AI': 'Artificial Intelligence',
  'AIADS': 'AI & Data Science',
  'AIAIDS': 'AI & AI & Data Science',
  'AIML': 'AI & Machine Learning',
  'AIR': 'Artificial Intelligence & Robotics',
  'AME': 'Automobile Engineering',
  'ARE': 'Automobile Engineering',
  'AUTO': 'Automobile Engineering',
  'BEIL': 'Bio Engineering',
  'BM': 'Biomedical Engineering',
  'BT': 'Biotechnology',
  'CE': 'Civil Engineering',
  'CEWCA': 'Civil Engineering with Computer Application',
  'CEng': 'Civil Engineering',
  'CHEM': 'Chemical Engineering',
  'CMPS': 'Computer Science',
  'CSBS': 'Computer Science & Business Systems',
  'CSD': 'Computer Science & Design',
  'CSE': 'Computer Science & Engineering',
  'CSEAI': 'CSE with AI',
  'CSEAIADS': 'CSE with AI & Data Science',
  'CSEBC': 'CSE with Blockchain',
  'CSECS': 'CSE with Cyber Security',
  'CSEDS': 'CSE with Data Science',
  'CSEIL': 'CSE with Internet of Things',
  'CSEIML': 'CSE with AI & ML',
  'CSEIOT': 'CSE with IoT',
  'CSEITCS': 'CSE with IT & Cyber Security',
  'CSERC': 'CSE with Robotics',
  'CSIT': 'Computer Science & IT',
  'CST': 'Computer Science Technology',
  'CYSEC': 'Cyber Security',
  'DS': 'Data Science',
  'EACE': 'Electronics & Computer Engineering',
  'EAPE': 'Electronics & Computer Engineering',
  'EC': 'Electronics & Communication Engineering',
  'ECACT': 'Electronics & Communication Engineering',
  'ECS': 'Electronics & Computer Science',
  'EE': 'Electrical Engineering',
  'EEVDT': 'Electrical Engineering with VLSI',
  'EI': 'Electronics & Instrumentation',
  'EL': 'Electrical Engineering',
  'ELECT ELEX': 'Electronics Engineering',
  'ET': 'Electronics & Telecommunication',
  'EV': 'Electric Vehicle Engineering',
  'Electronics and\nTelecommunications': 'Electronics & Telecommunication',
  'FTS': 'Fashion Technology',
  'INOT': 'Internet of Things',
  'IP': 'Industrial & Production Engineering',
  'IT': 'Information Technology',
  'ITAIAR': 'IT with AI & AR',
  'LG': 'Logistics Engineering',
  'MAC': 'Mechatronics',
  'MECH': 'Mechanical Engineering',
  'MINING': 'Mining Engineering',
  'MTENG': 'Mechatronics Engineering',
  'PCT': 'Paint Technology',
};
