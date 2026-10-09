import { useState } from 'react';
import { hostelNoticeData, isReportingPeriodOver } from './hostelInfo';

export default function HostelInfo() {
  const [checkedDocs, setCheckedDocs] = useState({});
  const windowClosed = isReportingPeriodOver();

  const toggleDoc = (id) => {
    setCheckedDocs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const checkedCount = Object.values(checkedDocs).filter(Boolean).length;
  const totalDocs = hostelNoticeData.documentsChecklist.length;

  return (
    <div className="hostel-info-container">
      {/* Official Notice Header */}
      <div className="card notice-banner-card">
        <div className="notice-badge-row">
          <span className="badge badge-pink">Official Notification</span>
          <span className="notice-ref">Ref: {hostelNoticeData.refNumber}</span>
        </div>
        <h2 className="notice-title">{hostelNoticeData.hostelName}</h2>
        <p className="notice-subtitle">{hostelNoticeData.institution} — Session {hostelNoticeData.session}</p>

        {/* Reporting Period Alert */}
        <div className={`window-status-box ${windowClosed ? 'closed' : 'open'}`}>
          <div className="window-icon">{windowClosed ? '⚠️' : '📅'}</div>
          <div>
            <div className="window-heading">
              {windowClosed ? 'Reporting Window Closed' : 'Reporting Window Active'}
            </div>
            <p className="window-dates">
              Official Reporting Period: <strong>{hostelNoticeData.reportingRangeFormatted}</strong>
            </p>
            {windowClosed && (
              <p className="window-note">
                The scheduled first-round reporting dates have concluded. For vacant room allotment or late reporting queries, contact the hostel office.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Office & Timing Card */}
      <div className="info-two-col">
        <div className="card info-mini-card">
          <div className="card-top-icon">⏰</div>
          <h3>Office Hours & Reporting</h3>
          <ul className="info-list">
            <li>
              <strong>Room Entry & Reporting:</strong> {hostelNoticeData.officeHoursAllotment}
            </li>
            <li>
              <strong>General Enquiries:</strong> {hostelNoticeData.officeHoursEnquiries}
            </li>
            <li>
              <strong>Hostel Office Phone:</strong>{' '}
              <a href={`tel:${hostelNoticeData.officePhone.replace(/-/g, '')}`} className="phone-link">
                📞 {hostelNoticeData.officePhone}
              </a>{' '}
              <span className="muted-text">(Tap to call)</span>
            </li>
            <li>
              <strong>Room Sharing:</strong> {hostelNoticeData.roomPolicy}
            </li>
          </ul>
        </div>

        <div className="card info-mini-card">
          <div className="card-top-icon">💳</div>
          <h3>Fee Structure & Adjustments</h3>
          <div className="fee-breakdown">
            <div className="fee-row">
              <span>Hostel Fee (Annual):</span>
              <strong className="fee-amt">₹{hostelNoticeData.fees.hostelFee.toLocaleString()} / year</strong>
            </div>
            <div className="fee-row">
              <span>Caution Money (Refundable):</span>
              <strong className="fee-amt">₹{hostelNoticeData.fees.cautionMoney.toLocaleString()}</strong>
            </div>
          </div>
          <p className="fee-note">
            ℹ️ {hostelNoticeData.fees.cautionMoneyTerms}
          </p>
          <div className="bus-adjustment-badge">
            🚌 <strong>Bus Fee Adjustment:</strong> {hostelNoticeData.fees.busFeeAdjustment}
          </div>
        </div>
      </div>

      {/* Verification & Quota Notice */}
      <div className="card rules-card">
        <h3>Special Quotas & Information Verification</h3>
        <p>{hostelNoticeData.specialReservations}</p>
        <div className="mess-info-banner">
          🍽️ <strong>Hostel Mess:</strong> {hostelNoticeData.messInfo}
        </div>
      </div>

      {/* Interactive Documents Checklist */}
      <div className="card checklist-card">
        <div className="checklist-header">
          <div>
            <h3>Documents to Carry at Reporting</h3>
            <p className="checklist-sub">
              Check off the mandatory original certificates and photocopies you have prepared ({checkedCount}/{totalDocs} ready)
            </p>
          </div>
          {checkedCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => setCheckedDocs({})}>
              Reset Checklist
            </button>
          )}
        </div>

        <div className="checklist-items">
          {hostelNoticeData.documentsChecklist.map((doc, idx) => {
            const isChecked = Boolean(checkedDocs[doc.id]);
            return (
              <label
                key={doc.id}
                className={`checklist-item ${isChecked ? 'completed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleDoc(doc.id)}
                />
                <span className="checkbox-custom" aria-hidden="true">
                  {isChecked ? '✓' : ''}
                </span>
                <div className="doc-info">
                  <span className="doc-num">#{idx + 1}</span>
                  <span className="doc-title">{doc.title}</span>
                  {doc.note && <span className="doc-badge">{doc.note}</span>}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* University Web Link */}
      <div className="card booklet-card">
        <p>
          For additional guidelines and administrative rules, refer to the official university portal:
        </p>
        <a
          href={hostelNoticeData.officialWebsite}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary website-btn"
        >
          Visit UIT RGPV Official Website ↗
        </a>
      </div>
    </div>
  );
}
