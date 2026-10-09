import { useState, useMemo } from 'react';
import { useUnlock } from './UnlockContext';

export default function HostelTab({ hostelRecords, loading, error }) {
  const { isUnlocked, openUnlockModal, getPrivateRecord } = useUnlock();

  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('room'); // 'room' | 'air'
  const [expandedId, setExpandedId] = useState(null);

  // Available filter options
  const filterOptions = useMemo(() => {
    if (!hostelRecords || hostelRecords.length === 0) return { courses: [], branches: [], blocks: [], categories: [] };
    const courses = [...new Set(hostelRecords.map(r => r.course).filter(Boolean))].sort();
    const branches = [...new Set(hostelRecords.map(r => r.branch).filter(Boolean))].sort();
    const blocks = [...new Set(hostelRecords.map(r => r.block).filter(Boolean))].sort();
    const categories = [...new Set(hostelRecords.map(r => r.category).filter(Boolean))].sort();
    return { courses, branches, blocks, categories };
  }, [hostelRecords]);

  // Natural room comparator (Block letter first, then numerical room number)
  const compareRooms = (a, b) => {
    const blockA = a.block || '';
    const blockB = b.block || '';
    if (blockA !== blockB) return blockA.localeCompare(blockB);
    const numA = parseInt(a.roomNo, 10) || 0;
    const numB = parseInt(b.roomNo, 10) || 0;
    return numA - numB;
  };

  // Filter & sort
  const filteredRecords = useMemo(() => {
    if (!hostelRecords) return [];
    let list = [...hostelRecords];
    const q = searchQuery.trim().toLowerCase();

    if (q) {
      list = list.filter(r => {
        const priv = isUnlocked ? getPrivateRecord(r.id) : null;
        const matchesRoom = r.room.toLowerCase().includes(q);
        const matchesBranch = (r.branch || '').toLowerCase().includes(q);
        const matchesCat = (r.category || '').toLowerCase().includes(q);
        const matchesAIR = r.air ? String(r.air).includes(q) : false;
        const matchesMasked = r.maskedName.toLowerCase().includes(q);
        const matchesFullName = priv ? priv.fullName.toLowerCase().includes(q) : false;
        return matchesRoom || matchesBranch || matchesCat || matchesAIR || matchesMasked || matchesFullName;
      });
    }

    if (courseFilter !== 'ALL') {
      list = list.filter(r => r.course === courseFilter);
    }
    if (branchFilter !== 'ALL') {
      list = list.filter(r => r.branch === branchFilter);
    }
    if (blockFilter !== 'ALL') {
      list = list.filter(r => r.block === blockFilter);
    }
    if (categoryFilter !== 'ALL') {
      list = list.filter(r => r.category === categoryFilter);
    }

    if (sortBy === 'air') {
      list.sort((a, b) => {
        if (!a.air) return 1;
        if (!b.air) return -1;
        return a.air - b.air;
      });
    } else {
      list.sort(compareRooms);
    }

    return list;
  }, [hostelRecords, searchQuery, courseFilter, branchFilter, blockFilter, categoryFilter, sortBy, isUnlocked, getPrivateRecord]);

  // Stats calculation
  const stats = useMemo(() => {
    if (!hostelRecords) return { total: 0, bTech: 0, poly: 0, mca: 0, singleRooms: 0 };
    const total = hostelRecords.length;
    const bTech = hostelRecords.filter(r => r.course === 'B.TECH').length;
    const poly = hostelRecords.filter(r => r.course === 'POLYTECHNIC DIPLOMA').length;
    const mca = hostelRecords.filter(r => r.course === 'MCA').length;
    const singleRooms = hostelRecords.filter(r => r.publicFlags && r.publicFlags.includes('ROOM_SINGLE')).length;
    return { total, bTech, poly, mca, singleRooms };
  }, [hostelRecords]);

  if (loading) {
    return (
      <div className="hostel-tab-container">
        <div className="card loading-card">
          <div className="spinner"></div>
          <p>Loading hostel allotment records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hostel-tab-container">
        <div className="card error-card">
          <h3>Failed to load hostel data</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hostel-tab-container">
      {/* Stats Strip */}
      <div className="stats-strip">
        <div className="stat-pill">
          <span className="stat-num">{stats.total}</span>
          <span className="stat-label">Total Allotted</span>
        </div>
        <div className="stat-pill">
          <span className="stat-num">{stats.bTech}</span>
          <span className="stat-label">B.Tech</span>
        </div>
        <div className="stat-pill">
          <span className="stat-num">{stats.poly}</span>
          <span className="stat-label">Polytechnic</span>
        </div>
        <div className="stat-pill">
          <span className="stat-num">{stats.mca}</span>
          <span className="stat-label">MCA</span>
        </div>
        <div className="stat-pill highlight-pill">
          <span className="stat-num">{stats.singleRooms}</span>
          <span className="stat-label">Single Rooms</span>
        </div>
      </div>

      {/* Search & Sort Card */}
      <div className="card hostel-filter-card">
        <div className="hostel-search-row">
          <input
            type="text"
            className="search-input"
            placeholder={
              isUnlocked
                ? "Search by room, branch, category, AIR, or full name..."
                : "Search by room, branch, category, AIR (unlock to search full name)..."
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <div className="sort-toggle">
            <button
              className={`sort-btn ${sortBy === 'room' ? 'active' : ''}`}
              onClick={() => setSortBy('room')}
            >
              By Room
            </button>
            <button
              className={`sort-btn ${sortBy === 'air' ? 'active' : ''}`}
              onClick={() => setSortBy('air')}
            >
              By AIR
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="filter-chips-section">
          {/* Course Chips */}
          <div className="chip-group">
            <span className="chip-label">Course:</span>
            <div className="chip-scroller">
              <button
                className={`chip ${courseFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setCourseFilter('ALL')}
              >
                All
              </button>
              {filterOptions.courses.map(c => (
                <button
                  key={c}
                  className={`chip ${courseFilter === c ? 'active' : ''}`}
                  onClick={() => setCourseFilter(c)}
                >
                  {c === 'POLYTECHNIC DIPLOMA' ? 'Polytechnic' : c}
                </button>
              ))}
            </div>
          </div>

          {/* Block Chips */}
          <div className="chip-group">
            <span className="chip-label">Block:</span>
            <div className="chip-scroller">
              <button
                className={`chip ${blockFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setBlockFilter('ALL')}
              >
                All
              </button>
              {filterOptions.blocks.map(b => (
                <button
                  key={b}
                  className={`chip ${blockFilter === b ? 'active' : ''}`}
                  onClick={() => setBlockFilter(b)}
                >
                  Block {b}
                </button>
              ))}
            </div>
          </div>

          {/* Branch & Category Selectors */}
          <div className="selector-row">
            <div className="select-wrapper">
              <label>Branch</label>
              <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
                <option value="ALL">All Branches</option>
                {filterOptions.branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="select-wrapper">
              <label>Category</label>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="ALL">All Categories</option>
                {filterOptions.categories.map(c => (
                  <option key={c} value={c}>{c === 'All India' ? 'All India quota' : c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="results-meta-header">
        <span className="count-label">
          Showing <strong>{filteredRecords.length}</strong> student{filteredRecords.length !== 1 ? 's' : ''}
        </span>
        {!isUnlocked && (
          <button className="btn-unlock-pill" onClick={openUnlockModal}>
            🔒 Unlock full names & phones
          </button>
        )}
      </div>

      {/* List of Hostel Records */}
      {filteredRecords.length === 0 ? (
        <div className="card empty-card">
          <p>No allotment records match your search query and filters.</p>
        </div>
      ) : (
        <div className="hostel-grid">
          {filteredRecords.map(item => {
            const isExpanded = expandedId === item.id;
            const privateData = isUnlocked ? getPrivateRecord(item.id) : null;
            const isSingle = item.publicFlags && item.publicFlags.includes('ROOM_SINGLE');

            // Find roommate objects
            const roommates = (item.roommateIds || [])
              .map(rId => hostelRecords.find(h => h.id === rId))
              .filter(Boolean);

            return (
              <div
                key={item.id}
                className={`card student-hostel-row ${isExpanded ? 'expanded' : ''}`}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <div className="student-hostel-summary">
                  <div className="room-indicator">
                    <span className="room-badge-small">{item.room}</span>
                  </div>

                  <div className="student-core-info">
                    <div className="student-name-row">
                      <h3 className="student-title-name">
                        {isUnlocked && privateData ? privateData.fullName : item.maskedName}
                      </h3>
                      {item.college === 'Other' && (
                        <span className="badge badge-warning">Other Institute</span>
                      )}
                      {isSingle && (
                        <span className="badge badge-target">Single Bed</span>
                      )}
                    </div>
                    <div className="student-tags">
                      <span>{item.course} {item.branch ? `(${item.branch})` : ''}</span>
                      <span>•</span>
                      <span>{item.category === 'All India' ? 'All India quota' : item.category}</span>
                      {item.air && (
                        <>
                          <span>•</span>
                          <span>AIR {item.air.toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="expand-chevron" aria-hidden="true">
                    {isExpanded ? '▲' : '▼'}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="expanded-details-pane" onClick={e => e.stopPropagation()}>
                    <div className="expanded-divider"></div>

                    {/* Roommate summary row */}
                    <div className="expanded-sub-block">
                      <h4 className="sub-block-title">Roommate</h4>
                      {isSingle ? (
                        <p className="roommate-status-text">Roommate not allotted yet.</p>
                      ) : roommates.length > 0 ? (
                        <div className="expanded-roommate-chips">
                          {roommates.map(rm => {
                            const rmPrivate = isUnlocked ? getPrivateRecord(rm.id) : null;
                            return (
                              <div key={rm.id} className="expanded-roommate-item">
                                <span className="rm-name">
                                  {isUnlocked && rmPrivate ? rmPrivate.fullName : rm.maskedName}
                                </span>
                                <span className="rm-meta">
                                  {rm.course} {rm.branch ? `(${rm.branch})` : ''} • {rm.category}
                                </span>
                                {isUnlocked && rmPrivate?.studentMobile && (
                                  <a href={`tel:${rmPrivate.studentMobile}`} className="rm-phone">
                                    📞 {rmPrivate.studentMobile}
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="roommate-status-text">No roommate linked.</p>
                      )}
                    </div>

                    {/* Personal contacts block */}
                    <div className="expanded-sub-block">
                      <div className="contacts-sub-header">
                        <h4 className="sub-block-title">Verified Contact Information</h4>
                        {!isUnlocked && (
                          <button className="btn-unlock-pill-sm" onClick={openUnlockModal}>
                            🔒 Unlock
                          </button>
                        )}
                      </div>

                      {isUnlocked && privateData ? (
                        <div className="unlocked-contact-table">
                          <div className="contact-field">
                            <span className="field-lbl">Student Phone:</span>
                            <span className="field-val">
                              {privateData.studentMobile ? (
                                <a href={`tel:${privateData.studentMobile}`}>{privateData.studentMobile}</a>
                              ) : 'Not recorded'}
                              {privateData.altStudentMobile && ` / ${privateData.altStudentMobile}`}
                            </span>
                          </div>
                          <div className="contact-field">
                            <span className="field-lbl">Father's Name:</span>
                            <span className="field-val">{privateData.fatherName || 'Not recorded'}</span>
                          </div>
                          <div className="contact-field">
                            <span className="field-lbl">Father's Phone:</span>
                            <span className="field-val">
                              {privateData.fatherMobile ? (
                                <a href={`tel:${privateData.fatherMobile}`}>{privateData.fatherMobile}</a>
                              ) : 'Not recorded'}
                              {privateData.altFatherMobile && ` / ${privateData.altFatherMobile}`}
                            </span>
                          </div>
                          {privateData.note && (
                            <div className="contact-field note-field">
                              <span className="field-lbl">Remarks:</span>
                              <span className="field-val">{privateData.note}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="locked-pane-compact" onClick={openUnlockModal}>
                          <span>🔒 Mobile and guardian details are encrypted. Click to unlock.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
