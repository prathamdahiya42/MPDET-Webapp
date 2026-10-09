import fs from 'node:fs';
import path from 'node:path';
import xlsxPkg from 'xlsx';

const XLSX = xlsxPkg.default || xlsxPkg;

// Devanagari transliteration helper
const devanagariDict = {
  'ब्रज': 'Braj',
  'अहिरवार': 'Ahirwar',
  'गणेशराम': 'Ganeshram',
  'राम': 'Ram',
  'कुमार': 'Kumar',
  'सिंह': 'Singh',
  'वर्मा': 'Varma',
  'शर्मा': 'Sharma',
  'यादव': 'Yadav',
  'पटेल': 'Patel'
};

function transliterateHindi(text) {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  const trans = words.map(w => {
    if (devanagariDict[w]) return devanagariDict[w];
    // Generic fallback mapping for simple devanagari
    const chars = {
      'अ': 'A', 'आ': 'Aa', 'इ': 'I', 'ई': 'Ee', 'उ': 'U', 'ऊ': 'Oo', 'ऋ': 'Ri',
      'ए': 'E', 'ऐ': 'Ai', 'ओ': 'O', 'औ': 'Au',
      'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
      'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
      'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
      'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
      'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
      'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
      'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
      'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', '्': '', 'ं': 'n', 'ँ': 'n', 'ः': 'h'
    };
    let out = '';
    for (let i = 0; i < w.length; i++) {
      const ch = w[i];
      out += chars[ch] || ch;
    }
    return out.charAt(0).toUpperCase() + out.slice(1);
  });
  return trans.join(' ');
}

// Capitalize Title Case keeping MD, MOHD., initials
export function toTitleCase(str) {
  if (!str) return '';
  const trimmed = str.trim().replace(/\s+/g, ' ');
  const parts = trimmed.split(' ');
  return parts.map(p => {
    const upper = p.toUpperCase();
    if (['MD', 'MD.', 'MOHD', 'MOHD.', 'DR', 'DR.'].includes(upper)) return upper;
    if (/^[A-Z]\.?$/.test(upper)) return upper; // e.g. "K.", "A"
    if (['II', 'III', 'IV'].includes(upper)) return upper;
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }).join(' ');
}

// Generate sample 8-row fallback if private/HostelData.xlsx is missing
export function generateSampleHostelData(destPath) {
  const sampleRows = [
    ['S.No', 'Name', 'AIR', 'Student Mobile', 'Father Name', 'Father Mobile', 'Gender', 'College', 'Course', 'Branch', 'J&K Resident', 'Category', 'Room', 'Notes'],
    [1, 'Sample Student Alpha', 54321, '9876543210', 'Father Alpha', '9876543211', 'Male', 'UIT', 'B.TECH', 'CSE', 'No', 'UR', 'G-1', 'Sample row 1'],
    [2, 'Sample Student Beta', 54322, '9876543212', 'Father Beta', '9876543213', 'Male', 'UIT', 'B.TECH', 'CSE', 'No', 'OBC', 'G-1', 'Sample row 2'],
    [3, 'Sample Student Gamma', 89210, '9876543214', 'Father Gamma', '9876543215', 'Male', 'UIT', 'B.TECH', 'IT', 'No', 'EWS', 'F-1', 'Sample row 3'],
    [4, 'Sample Student Delta', 89211, '9876543216', 'Father Delta', '9876543217', 'Male', 'UIT', 'B.TECH', 'EC', 'No', 'SC', 'F-1', 'Sample row 4'],
    [5, 'Sample Student Epsilon', '', '9876543218', 'Father Epsilon', '9876543219', 'Male', 'UIT', 'POLYTECHNIC DIPLOMA', 'CE', '', 'UR', 'S-1', 'Sample row 5'],
    [6, 'Sample Student Zeta', '', '9876543220', 'Father Zeta', '9876543221', 'Male', 'UIT', 'POLYTECHNIC DIPLOMA', 'ME', '', 'ST', 'S-1', 'Sample row 6'],
    [7, 'Sample Student Eta', '', '9876543222', 'Father Eta', '9876543223', 'Male', 'UIT', 'MCA', '', '', 'UR', 'S-2', 'Sample row 7'],
    [8, 'Sample Student Theta', 123456, '9876543224', 'Father Theta', '9876543225', 'Male', 'UIT', 'B.TECH', 'ME', 'No', 'All India', 'G-2', 'Sample row 8']
  ];
  const ws = XLSX.utils.aoa_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hostel');
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  XLSX.writeFile(wb, destPath);
}

// Clean phone number and extract alternate numbers and remarks
function cleanMobileCell(rawVal) {
  if (rawVal === undefined || rawVal === null || rawVal === '') {
    return { main: null, alt: null, textNote: null, raw: '', isInvalid: false };
  }
  let str = String(rawVal).trim();
  if (str === '-' || str === 'undefined' || str === 'null') {
    return { main: null, alt: null, textNote: null, raw: str, isInvalid: false };
  }

  let textNote = null;
  let isInvalid = false;

  // Extract trailing remark like "(mummy ka" or "(mummy ka)"
  const remarkMatch = str.match(/\(([^)]*)$/) || str.match(/\(([^)]+)\)/);
  if (remarkMatch) {
    textNote = `Remark in mobile: "${remarkMatch[0]}"`;
    str = str.replace(remarkMatch[0], '').trim();
  }

  // Check if cell is purely alphabetic text (e.g. "Prahlad tamrkar")
  if (/^[a-zA-Z\s.]+$/.test(str)) {
    return {
      main: null,
      alt: null,
      textNote: `"${str}" found in mobile column`,
      raw: str,
      isInvalid: false
    };
  }

  // Check if string contains a name followed/preceded by digits, e.g. "MOTILAL RAJPANDE 8963912136"
  const mixedMatch = str.match(/([a-zA-Z\s.]+)\s+(\d{10})/);
  if (mixedMatch) {
    return {
      main: mixedMatch[2],
      alt: null,
      textNote: `"${mixedMatch[1].trim()}" found in mobile column`,
      raw: str,
      isInvalid: false
    };
  }

  // Check for two numbers separated by comma, slash or space
  const delimiterMatch = str.split(/[,/]/);
  let mainNum = null;
  let altNum = null;

  const normalizePhone = (numStr) => {
    if (!numStr) return null;
    let digits = numStr.replace(/[\s\-+]/g, '');
    if (digits.startsWith('91') && digits.length === 12) {
      digits = digits.slice(2);
    }
    if (digits.startsWith('0') && digits.length === 11) {
      digits = digits.slice(1);
    }
    return digits;
  };

  if (delimiterMatch.length > 1) {
    const first = normalizePhone(delimiterMatch[0]);
    const second = normalizePhone(delimiterMatch[1]);
    mainNum = (first && first.length === 10) ? first : null;
    altNum = (second && second.length === 10) ? second : null;
    if (!mainNum && first) isInvalid = true;
    if (!altNum && second) isInvalid = true;
  } else {
    const cleaned = normalizePhone(str);
    if (cleaned && cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
      mainNum = cleaned;
    } else {
      isInvalid = true;
      textNote = textNote ? `${textNote}; raw mobile: "${str}"` : `Invalid mobile raw value: "${str}"`;
    }
  }

  return { main: mainNum, alt: altNum, textNote, raw: str, isInvalid };
}

// Complete truncated surname if present in father name or student name
function completeTruncatedName(studentName, fatherName) {
  let s = studentName;
  let f = fatherName;
  let completed = false;

  const sUpper = s.toUpperCase();
  const fUpper = f.toUpperCase();

  const pairs = [
    { frag: 'CHAT', full: 'Chaturvedi' },
    { frag: 'MESHR', full: 'Meshram' },
    { frag: 'SHRIV', full: 'Shrivastava' },
    { frag: 'RAJPU', full: 'Rajput' },
    { frag: 'SING', full: 'Singh' }
  ];

  for (const { frag, full } of pairs) {
    // Check if student ends with frag and father contains full
    if (sUpper.endsWith(' ' + frag) || sUpper === frag) {
      if (fUpper.includes(full.toUpperCase())) {
        s = s.slice(0, s.length - frag.length) + full;
        completed = true;
      }
    }
    // Check if father ends with frag and student contains full
    if (fUpper.endsWith(' ' + frag) || fUpper === frag) {
      if (sUpper.includes(full.toUpperCase())) {
        f = f.slice(0, f.length - frag.length) + full;
        completed = true;
      }
    }
  }

  return { studentName: s, fatherName: f, completed };
}

export function cleanHostelDataset(hostelPath, meritPath) {
  if (!fs.existsSync(hostelPath)) {
    console.warn(`Hostel data file not found at ${hostelPath}. Generating 8-row sample data...`);
    generateSampleHostelData(hostelPath);
  }

  const wbHostel = XLSX.readFile(hostelPath);
  const targetSheetName = wbHostel.SheetNames.includes('Hostel')
    ? 'Hostel'
    : (wbHostel.SheetNames.includes('All Students') ? 'All Students' : wbHostel.SheetNames[0]);
  const wsHostel = wbHostel.Sheets[targetSheetName];
  const rawRows = XLSX.utils.sheet_to_json(wsHostel, { header: 1 });

  if (rawRows.length < 2) {
    throw new Error(`Sheet ${targetSheetName} contains no data rows.`);
  }

  // Header mapping
  const headerRow = rawRows[0].map(h => String(h || '').trim().toLowerCase());
  const findCol = (...aliases) => {
    for (const alias of aliases) {
      const idx = headerRow.findIndex(h => h === alias || h.includes(alias));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const colSNo = findCol('s. no.', 's.no', 's. no', 'sno');
  const colName = findCol('name of student', 'name', 'student name');
  const colAIR = findCol('all india rank', 'air', 'rank');
  const colStudentMob = findCol('student mobile', 'student phone', 'student mob');
  const colFatherName = findCol("father's name", 'father name', 'father');
  const colFatherMob = findCol("father's mobile", 'father mobile', 'father phone');
  const colGender = findCol('gender');
  const colCollege = findCol('college');
  const colCourse = findCol('course');
  const colBranch = findCol('branch');
  const colJK = findCol('whether j&k resident', 'j&k resident', 'jk resident', 'j&k');
  const colCategory = findCol('category');
  const colRoom = findCol('allotted room', 'room', 'room no');
  const colNotes = findCol('notes', 'note', 'remarks');

  // Load merit data for linking
  const meritStudents = [];
  if (fs.existsSync(meritPath)) {
    const wbMerit = XLSX.readFile(meritPath);
    const wsMerit = wbMerit.Sheets[wbMerit.SheetNames[0]];
    const meritRows = XLSX.utils.sheet_to_json(wsMerit, { header: 1 });
    for (let i = 5; i < meritRows.length; i++) {
      const r = meritRows[i];
      if (!r || !r[3]) continue;
      meritStudents.push({
        jeeRank: Number(r[1]),
        rollNo: String(r[2]).trim(),
        name: String(r[3]).trim().toLowerCase().replace(/\s+/g, ' ')
      });
    }
  } else {
    console.warn(`CommonView.xlsx not found at ${meritPath}; meritKey linking skipped.`);
  }

  const reports = []; // { rowNumber, flag, description, student }
  const records = [];

  let rowCounter = 0;

  for (let rIdx = 1; rIdx < rawRows.length; rIdx++) {
    const row = rawRows[rIdx];
    if (!row || row.length === 0 || (!row[colName] && !row[colRoom])) continue;
    rowCounter++;
    const excelRowNumber = rIdx + 1; // 1-indexed

    const rawSNo = colSNo !== -1 ? row[colSNo] : rowCounter;
    let rawName = colName !== -1 ? String(row[colName] || '').trim() : '';
    const rawAIR = colAIR !== -1 ? row[colAIR] : '';
    const rawStudentMob = colStudentMob !== -1 ? row[colStudentMob] : '';
    let rawFatherName = colFatherName !== -1 ? String(row[colFatherName] || '').trim() : '';
    const rawFatherMob = colFatherMob !== -1 ? row[colFatherMob] : '';
    const rawGender = colGender !== -1 ? String(row[colGender] || 'Male').trim() : 'Male';
    const rawCollege = colCollege !== -1 ? String(row[colCollege] || 'UIT').trim() : 'UIT';
    const rawCourse = colCourse !== -1 ? String(row[colCourse] || '').trim().toUpperCase() : '';
    const rawBranch = colBranch !== -1 ? String(row[colBranch] || '').trim().toUpperCase() : '';
    const rawJK = colJK !== -1 ? String(row[colJK] || '').trim() : '';
    const rawCategory = colCategory !== -1 ? String(row[colCategory] || '').trim() : 'UR';
    let rawRoom = colRoom !== -1 ? String(row[colRoom] || '').trim().toUpperCase() : '';
    const rawNotes = colNotes !== -1 ? String(row[colNotes] || '').trim() : '';

    const studentFlags = [];
    const notesList = [];
    if (rawNotes) notesList.push(rawNotes);

    // 1. Devanagari transliteration check
    let nameEn = null;
    if (/[\u0900-\u097F]/.test(rawName)) {
      nameEn = transliterateHindi(rawName);
      studentFlags.push('TRANSLITERATED');
      reports.push({
        rowNumber: excelRowNumber,
        flag: 'TRANSLITERATED',
        description: `Name "${rawName}" transliterated to "${nameEn}"`,
        student: rawName
      });
    }

    if (/[\u0900-\u097F]/.test(rawFatherName)) {
      const fatherEn = transliterateHindi(rawFatherName);
      rawFatherName = `${rawFatherName} (${fatherEn})`;
    }

    // 2. Truncated name completion
    const comp = completeTruncatedName(rawName, rawFatherName);
    if (comp.completed) {
      rawName = comp.studentName;
      rawFatherName = comp.fatherName;
    } else {
      // Check for known truncated suffixes
      const knownFrags = ['SHRIV', 'RAJPU', 'CHAT', 'AHA', 'MESHR', 'TIWA', 'SING'];
      const upperName = rawName.toUpperCase();
      if (knownFrags.some(f => upperName.endsWith(' ' + f) || upperName === f)) {
        studentFlags.push('NAME_TRUNCATED');
        reports.push({
          rowNumber: excelRowNumber,
          flag: 'NAME_TRUNCATED',
          description: `Student name "${rawName}" appears truncated; kept as written`,
          student: rawName
        });
      }
    }

    // Casing normalization
    const fullName = /[\u0900-\u097F]/.test(rawName) ? rawName : toTitleCase(rawName);
    const fatherName = /[\u0900-\u097F]/.test(rawFatherName) ? rawFatherName : toTitleCase(rawFatherName);

    // 3. AIR parsing & validation
    let air = null;
    if (rawAIR !== undefined && rawAIR !== null && String(rawAIR).trim() !== '') {
      air = parseInt(String(rawAIR).replace(/,/g, '').trim(), 10);
      if (isNaN(air)) air = null;
      if (air && air > 2000000) {
        studentFlags.push('AIR_OUTLIER');
        reports.push({
          rowNumber: excelRowNumber,
          flag: 'AIR_OUTLIER',
          description: `AIR ${air.toLocaleString()} exceeds 2,000,000`,
          student: fullName
        });
      }
    }

    // 4. Mobiles cleaning
    const smClean = cleanMobileCell(rawStudentMob);
    const fmClean = cleanMobileCell(rawFatherMob);

    if (smClean.textNote) notesList.push(`[Student Mobile]: ${smClean.textNote}`);
    if (fmClean.textNote) notesList.push(`[Father Mobile]: ${fmClean.textNote}`);

    if (smClean.isInvalid || fmClean.isInvalid) {
      studentFlags.push('INVALID_MOBILE');
      reports.push({
        rowNumber: excelRowNumber,
        flag: 'INVALID_MOBILE',
        description: `Invalid mobile format (Student: "${rawStudentMob}", Father: "${rawFatherMob}")`,
        student: fullName
      });
    }

    // 5. College "Other"
    if (rawCollege.toLowerCase() === 'other') {
      studentFlags.push('COLLEGE_OTHER');
      reports.push({
        rowNumber: excelRowNumber,
        flag: 'COLLEGE_OTHER',
        description: `College listed as "Other" (IT student)`,
        student: fullName
      });
    }

    // 6. Room formatting
    rawRoom = rawRoom.replace(/\s+/g, '');
    let block = '';
    let roomNo = '';
    const roomMatch = rawRoom.match(/^([GFS])-?(\d{1,3})$/i);
    if (roomMatch) {
      block = roomMatch[1].toUpperCase();
      roomNo = roomMatch[2];
      rawRoom = `${block}-${roomNo}`;
    }

    // Category standardizing
    let category = rawCategory;
    if (category.toLowerCase() === 'all india') {
      category = 'All India';
    }

    // Generate stable unique ID: h001, h002...
    const id = `h${String(rowCounter).padStart(3, '0')}`;

    // Compute masked name
    let maskedName = '';
    if (nameEn) {
      const parts = nameEn.split(' ');
      maskedName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.` : parts[0];
    } else if (/[\u0900-\u097F]/.test(fullName)) {
      const parts = fullName.split(' ');
      maskedName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.` : parts[0];
    } else {
      const parts = fullName.split(' ');
      maskedName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.` : parts[0];
    }

    // Merit linking
    let meritKey = null;
    if (air && meritStudents.length > 0) {
      const normName = fullName.toLowerCase().replace(/\s+/g, ' ');
      let matches = meritStudents.filter(m => m.jeeRank === air && m.name === normName);
      if (matches.length === 0 && normName.length >= 14) {
        matches = meritStudents.filter(m => m.jeeRank === air && m.name.startsWith(normName.slice(0, 14)));
      }
      if (matches.length === 1) {
        meritKey = matches[0].rollNo;
      }
    }

    records.push({
      id,
      excelRowNumber,
      sNo: rawSNo,
      fullName,
      nameEn,
      maskedName,
      air,
      studentMobile: smClean.main,
      altStudentMobile: smClean.alt,
      fatherName,
      fatherMobile: fmClean.main,
      altFatherMobile: fmClean.alt,
      gender: rawGender,
      college: rawCollege,
      course: rawCourse,
      branch: rawBranch,
      jkResident: rawJK,
      category,
      room: rawRoom,
      block,
      roomNo,
      meritKey,
      note: notesList.length > 0 ? notesList.join(' | ') : null,
      flags: studentFlags,
      roommateIds: []
    });
  }

  // 7. Check for SHARED_MOBILE
  const phoneToRecords = {};
  records.forEach(rec => {
    [rec.studentMobile, rec.fatherMobile].forEach(phone => {
      if (phone && phone.length === 10) {
        if (!phoneToRecords[phone]) phoneToRecords[phone] = [];
        phoneToRecords[phone].push(rec);
      }
    });
  });

  Object.entries(phoneToRecords).forEach(([phone, list]) => {
    const uniqueFathers = new Set(list.map(r => r.fatherName.toLowerCase()));
    if (uniqueFathers.size > 1) {
      list.forEach(r => {
        if (!r.flags.includes('SHARED_MOBILE')) {
          r.flags.push('SHARED_MOBILE');
          reports.push({
            rowNumber: r.excelRowNumber,
            flag: 'SHARED_MOBILE',
            description: `Mobile ${phone} shared with another student with different father`,
            student: r.fullName
          });
        }
      });
    }
  });

  // 8. Check for POSSIBLE_DUPLICATE
  const namePhoneMap = {};
  records.forEach(r => {
    if (r.studentMobile) {
      const key = `${r.fullName.toLowerCase()}_${r.studentMobile}`;
      if (!namePhoneMap[key]) namePhoneMap[key] = [];
      namePhoneMap[key].push(r);
    }
  });

  Object.values(namePhoneMap).forEach(group => {
    if (group.length > 1) {
      group.forEach(r => {
        if (!r.flags.includes('POSSIBLE_DUPLICATE')) {
          r.flags.push('POSSIBLE_DUPLICATE');
          reports.push({
            rowNumber: r.excelRowNumber,
            flag: 'POSSIBLE_DUPLICATE',
            description: `Duplicate suspected: ${r.fullName} with same mobile ${r.studentMobile} appears in multiple rows`,
            student: r.fullName
          });
        }
      });
    }
  });

  // 9. Group by room to assign roommates and flag ROOM_SINGLE / ROOM_OVERFILLED
  const roomGroups = {};
  records.forEach(r => {
    if (!r.room) return;
    if (!roomGroups[r.room]) roomGroups[r.room] = [];
    roomGroups[r.room].push(r);
  });

  Object.entries(roomGroups).forEach(([room, occupants]) => {
    const occIds = occupants.map(o => o.id);
    occupants.forEach(o => {
      o.roommateIds = occIds.filter(id => id !== o.id);
      if (occupants.length === 1) {
        o.flags.push('ROOM_SINGLE');
        reports.push({
          rowNumber: o.excelRowNumber,
          flag: 'ROOM_SINGLE',
          description: `Single occupant in room ${room}; roommate not allotted yet`,
          student: o.fullName
        });
      } else if (occupants.length >= 3) {
        o.flags.push('ROOM_OVERFILLED');
        reports.push({
          rowNumber: o.excelRowNumber,
          flag: 'ROOM_OVERFILLED',
          description: `Room ${room} overfilled with ${occupants.length} students`,
          student: o.fullName
        });
      }
    });
  });

  // Generate private/hostel.cleaning-report.md
  const reportPath = path.resolve('private', 'hostel.cleaning-report.md');
  const reportContent = generateMarkdownReport(records, reports);
  fs.writeFileSync(reportPath, reportContent, 'utf8');

  return { records, reports, reportPath };
}

function generateMarkdownReport(records, reports) {
  const flagCounts = {};
  reports.forEach(r => {
    flagCounts[r.flag] = (flagCounts[r.flag] || 0) + 1;
  });

  const bTechRecords = records.filter(r => r.course === 'B.TECH');
  const matchedMerit = records.filter(r => r.meritKey);
  const unmatchedBTechMerit = bTechRecords.filter(r => !r.meritKey);

  let md = `# Hostel Data Cleaning Report

Generated: ${new Date().toISOString()}  
Total Records Processed: ${records.length}  

## Summary Statistics
| Metric | Value |
|---|---|
| Total Students | ${records.length} |
| B.Tech Students | ${bTechRecords.length} |
| Polytechnic Diploma Students | ${records.filter(r => r.course === 'POLYTECHNIC DIPLOMA').length} |
| MCA Students | ${records.filter(r => r.course === 'MCA').length} |
| Total Merit Linked Students | ${matchedMerit.length} |
| Unmatched B.Tech Candidates | ${unmatchedBTechMerit.length} |
| Total Unique Rooms | ${new Set(records.map(r => r.room).filter(Boolean)).size} |

## Flag Distribution
| Flag Type | Occurrence Count | Description |
|---|---|---|
`;

  Object.entries(flagCounts).sort((a, b) => b[1] - a[1]).forEach(([flag, count]) => {
    md += `| \`${flag}\` | ${count} | ${getFlagHelp(flag)} |\n`;
  });

  md += `\n## Detailed Flagged Rows\n\n`;
  md += `| Excel Row | Flag | Student | Details |\n`;
  md += `|---|---|---|---|\n`;

  // Sort by row number
  reports.sort((a, b) => a.rowNumber - b.rowNumber).forEach(r => {
    md += `| ${r.rowNumber} | \`${r.flag}\` | ${r.student} | ${r.description} |\n`;
  });

  md += `\n## Unmatched B.Tech Candidates (Merit Linking)\n\n`;
  md += `| Excel Row | Name | AIR | Branch | Room |\n`;
  md += `|---|---|---|---|---|\n`;
  unmatchedBTechMerit.forEach(u => {
    md += `| ${u.excelRowNumber} | ${u.fullName} | ${u.air || 'N/A'} | ${u.branch} | ${u.room} |\n`;
  });

  return md;
}

function getFlagHelp(flag) {
  switch (flag) {
    case 'TRANSLITERATED': return 'Devanagari name with generated Roman transliteration nameEn';
    case 'AIR_OUTLIER': return 'AIR exceeds 2,000,000';
    case 'INVALID_MOBILE': return 'Mobile number has unexpected length or formatting';
    case 'SHARED_MOBILE': return 'Same phone number appears for unrelated students (different father)';
    case 'NAME_TRUNCATED': return 'Name truncated and could not be reconstructed from father name';
    case 'SPLIT_ROW': return 'Glued cells detected and separated into distinct rows';
    case 'COLLEGE_OTHER': return 'Candidate college listed as Other';
    case 'POSSIBLE_DUPLICATE': return 'Duplicate candidate record suspected (same name + same student mobile)';
    case 'ROOM_SINGLE': return 'Single occupant allotted to room; roommate pending';
    case 'ROOM_OVERFILLED': return 'Room allotted to 3 or more occupants';
    default: return 'Data anomaly flag';
  }
}
