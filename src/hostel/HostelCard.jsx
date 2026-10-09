import { useUnlock } from './UnlockContext';

export default function HostelCard({ student, hostelRecords, onNavigateToHostelTab }) {
  const { isUnlocked, openUnlockModal, getPrivateRecord } = useUnlock();

  if (!student || !hostelRecords) return null;

  // Match by meritKey == student.rollNo
  const matched = hostelRecords.find(h => h.meritKey === student.rollNo);

  if (!matched) {
    return (
      <div className="card hostel-notice-card">
        <div className="hostel-notice-header">
          <span className="hostel-badge neutral">Hostel Status</span>
          <h3>Not in First-Year Hostel Allotment List</h3>
        </div>
        <p className="hostel-notice-desc">
          This candidate was not found in the initial APJ Abdul Kalam Boys Hostel allotment for UIT RGPV first-year session 2026-27.
        </p>
        {onNavigateToHostelTab && (
          <button
            className="btn btn-secondary btn-sm switch-tab-btn"
            onClick={onNavigateToHostelTab}
          >
            Browse Full Hostel Directory →
          </button>
        )}
      </div>
    );
  }

  const studentPrivate = getPrivateRecord(matched.id);

  // Find roommates
  const roommates = (matched.roommateIds || [])
    .map(rId => hostelRecords.find(h => h.id === rId))
    .filter(Boolean);

  const blockDescription = matched.block === 'S'
    ? 'Block S (Polytechnic & MCA)'
    : `Block ${matched.block} (B.Tech First Year)`;

  return (
    <div className="card hostel-card">
      <div className="hostel-card-header">
        <div>
          <span className="badge badge-pink">UIT RGPV Allotment</span>
          <h2 className="section-title" style={{ marginTop: '6px', marginBottom: '0', border: 'none', padding: '0' }}>
            APJ Abdul Kalam Boys Hostel
          </h2>
        </div>
        <div className="room-badge-container">
          <span className="room-label">ROOM</span>
          <span className="room-number-badge">{matched.room}</span>
        </div>
      </div>

      <div className="hostel-meta-grid">
        <div className="hostel-meta-item">
          <span className="meta-label">Block</span>
          <span className="meta-val">{blockDescription}</span>
        </div>
        <div className="hostel-meta-item">
          <span className="meta-label">Course & Branch</span>
          <span className="meta-val">{matched.course} {matched.branch ? `— ${matched.branch}` : ''}</span>
        </div>
        <div className="hostel-meta-item">
          <span className="meta-label">Category</span>
          <span className="meta-val">{matched.category === 'All India' ? 'All India quota' : matched.category}</span>
        </div>
        <div className="hostel-meta-item">
          <span className="meta-label">AIR</span>
          <span className="meta-val">{matched.air ? matched.air.toLocaleString() : 'N/A'}</span>
        </div>
      </div>

      {/* Private Student Contacts Section */}
      <div className="hostel-private-section">
        <div className="private-header-row">
          <h4>Personal & Family Contacts</h4>
          {!isUnlocked && (
            <button className="btn-unlock-pill" onClick={openUnlockModal}>
              🔒 Unlock details
            </button>
          )}
        </div>

        {isUnlocked && studentPrivate ? (
          <div className="private-details-grid">
            <div className="private-item">
              <span className="private-label">Full Name</span>
              <span className="private-val">{studentPrivate.fullName}</span>
            </div>
            <div className="private-item">
              <span className="private-label">Student Mobile</span>
              <span className="private-val">
                {studentPrivate.studentMobile ? (
                  <a href={`tel:${studentPrivate.studentMobile}`}>{studentPrivate.studentMobile}</a>
                ) : 'Not provided'}
                {studentPrivate.altStudentMobile && (
                  <span className="alt-phone"> / {studentPrivate.altStudentMobile}</span>
                )}
              </span>
            </div>
            <div className="private-item">
              <span className="private-label">Father's Name</span>
              <span className="private-val">{studentPrivate.fatherName || 'Not provided'}</span>
            </div>
            <div className="private-item">
              <span className="private-label">Father's Mobile</span>
              <span className="private-val">
                {studentPrivate.fatherMobile ? (
                  <a href={`tel:${studentPrivate.fatherMobile}`}>{studentPrivate.fatherMobile}</a>
                ) : 'Not provided'}
                {studentPrivate.altFatherMobile && (
                  <span className="alt-phone"> / {studentPrivate.altFatherMobile}</span>
                )}
              </span>
            </div>
            {studentPrivate.note && (
              <div className="private-item full-width">
                <span className="private-label">Office Remarks</span>
                <span className="private-val note">{studentPrivate.note}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="locked-placeholder" onClick={openUnlockModal}>
            <div className="locked-row">
              <span className="locked-label">Student Phone:</span>
              <span className="locked-mask">🔒 ••••••••••</span>
            </div>
            <div className="locked-row">
              <span className="locked-label">Father Details:</span>
              <span className="locked-mask">🔒 •••••••••••••••••</span>
            </div>
            <p className="locked-hint">Click or tap "Unlock details" to view verified phone numbers</p>
          </div>
        )}
      </div>

      {/* Roommate Section */}
      <div className="roommate-section">
        <h4 className="roommate-heading">Roommate Information</h4>
        {roommates.length === 0 ? (
          <div className="single-room-notice">
            <span className="badge badge-target">Single Occupant</span>
            <p>Roommate not allotted yet. Second bed currently unassigned for this room.</p>
          </div>
        ) : (
          <div className="roommate-cards-list">
            {roommates.map(rm => {
              const rmPrivate = getPrivateRecord(rm.id);
              return (
                <div key={rm.id} className="roommate-card">
                  <div className="roommate-card-top">
                    <div>
                      <span className="roommate-name">
                        {isUnlocked && rmPrivate ? rmPrivate.fullName : rm.maskedName}
                      </span>
                      <div className="roommate-sub">
                        <span>{rm.course} ({rm.branch || 'General'})</span>
                        <span>•</span>
                        <span>{rm.category === 'All India' ? 'All India quota' : rm.category}</span>
                        {rm.air && (
                          <>
                            <span>•</span>
                            <span>AIR {rm.air.toLocaleString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {isUnlocked && rmPrivate && (
                    <div className="roommate-unlocked-grid">
                      <div>
                        <span className="tiny-label">Mobile:</span>
                        <a href={`tel:${rmPrivate.studentMobile}`}>{rmPrivate.studentMobile || 'N/A'}</a>
                      </div>
                      <div>
                        <span className="tiny-label">Father:</span>
                        <span>{rmPrivate.fatherName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="tiny-label">Father Mob:</span>
                        <a href={`tel:${rmPrivate.fatherMobile}`}>{rmPrivate.fatherMobile || 'N/A'}</a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
