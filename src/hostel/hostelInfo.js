export const hostelNoticeData = {
  refNumber: 'UIT-RGPV / Chhatravas Karya / 2026 / 133',
  noticeDate: '29/07/2026',
  hostelName: 'APJ Abdul Kalam Boys Hostel',
  institution: 'UIT RGPV, Bhopal',
  session: '2026-27',
  targetStudents: 'First-Year (UIT B.Tech & Polytechnic Diploma)',
  roomPolicy: 'Two students share one room (double occupancy); allotment is valid for one academic session only.',
  reportingStart: '2026-07-29',
  reportingEnd: '2026-08-03',
  reportingRangeFormatted: '29 July 2026 to 03 August 2026',
  officeHoursAllotment: '10:30 AM to 5:00 PM',
  officeHoursEnquiries: 'Till 5:30 PM (Office hours only)',
  officePhone: '0755-2993893',
  fees: {
    hostelFee: 4800,
    cautionMoney: 4000,
    cautionMoneyTerms: 'One-time refundable caution money, returned after completion of course subject to submission of No-Dues Certificate from caretaker.',
    busFeeAdjustment: 'Both fees can be adjusted against bus fee paid during admission (students must carry original/photocopy of bus fee receipt).'
  },
  specialReservations: 'Rooms are reserved for Divyang (PwD) and Jammu & Kashmir native students beyond the merit-list count. All credentials filled in the application form are strictly verified at the time of reporting; false or erroneous information will result in immediate allotment cancellation without right of appeal.',
  documentsChecklist: [
    { id: 'app_form', title: 'Hostel Application Form', mandatory: true },
    { id: 'inst_fee', title: 'Photocopy of Institute Fee Receipt', mandatory: true, note: 'Mandatory' },
    { id: 'adm_cert', title: 'Admission / Registration Certificate', mandatory: true },
    { id: 'qual_marksheet', title: 'Qualifying Examination Marksheet / Scorecard (HS / High School / JEE)', mandatory: true },
    { id: 'residence_cert', title: 'Residence Certificate (Domicile)', mandatory: true },
    { id: 'income_cert', title: 'Income Certificate', mandatory: true },
    { id: 'pwd_cert', title: 'Disability Certificate', mandatory: false, note: 'If applicable' },
    { id: 'caste_cert', title: 'Caste Certificate', mandatory: false, note: 'If applicable (OBC/SC/ST/EWS)' },
    { id: 'declaration', title: 'Student & Guardian Declaration (Annexure-4)', mandatory: true }
  ],
  messInfo: 'A student mess is operated within the hostel premises. Current meal rates, schedules, and subscription rules are directly available from the hostel mess manager.',
  officialWebsite: 'https://www.uitrgpv.ac.in'
};

export function isReportingPeriodOver(endDateStr = hostelNoticeData.reportingEnd) {
  const deadline = new Date(`${endDateStr}T23:59:59`);
  return new Date() > deadline;
}
