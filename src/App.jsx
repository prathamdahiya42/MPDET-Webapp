import { useState, useEffect, useMemo } from 'react';
import { loadMeritData, loadCutoffData, searchStudents, matchesCutoff, branchFullNames } from './dataLoader';
import { loadHostelPublicData } from './hostel/hostelLoader';
import { useUnlock } from './hostel/UnlockContext';
import { isOwnerLocked } from './config';
import HostelCard from './hostel/HostelCard.jsx';
import HostelTab from './hostel/HostelTab.jsx';
import HostelInfo from './hostel/HostelInfo.jsx';
import UnlockModal from './hostel/UnlockModal.jsx';
import './App.css';

function App() {
  const { isUnlocked, openUnlockModal, lock } = useUnlock();

  // Navigation tab: 'predictor' | 'hostel' | 'info'
  const [activeTab, setActiveTab] = useState('predictor');

  // Predictor datasets & states
  const [meritData, setMeritData] = useState([]);
  const [cutoffData, setCutoffData] = useState([]);
  const [hostelData, setHostelData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hostelError, setHostelError] = useState(null);

  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState('name');
  const [results, setResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [filters, setFilters] = useState({
    branches: [],
    cities: [],
    type: 'all',
    tfw: false,
    genPool: false,
    feesRange: [0, 200000],
  });
  const [loadStatus, setLoadStatus] = useState({ merit: false, cutoff: false, hostel: false });

  // Initial Data Load
  useEffect(() => {
    Promise.all([
      loadMeritData().then(d => {
        setMeritData(d);
        setLoadStatus(p => ({ ...p, merit: true }));
      }),
      loadCutoffData().then(d => {
        setCutoffData(d);
        setLoadStatus(p => ({ ...p, cutoff: true }));
      }),
      loadHostelPublicData()
        .then(d => {
          setHostelData(d);
          setLoadStatus(p => ({ ...p, hostel: true }));
        })
        .catch(err => {
          console.warn('Hostel public data load error:', err);
          setHostelError(err.message);
        })
    ]).finally(() => setLoading(false));
  }, []);

  // Search Logic (Preserved exactly as before)
  const handleSearch = () => {
    if (!query.trim()) return;
    const q = query.trim();
    if (searchMode === 'roll') {
      const found = meritData.filter(s => s.rollNo === q);
      if (found.length === 1) {
        setSelectedStudent(found[0]);
        setDuplicates([]);
        setResults([]);
      } else if (found.length > 1) {
        setDuplicates(found);
        setSelectedStudent(null);
        setResults([]);
      } else {
        const partial = meritData.filter(s => s.rollNo.includes(q));
        if (partial.length > 0) {
          if (partial.length === 1) {
            setSelectedStudent(partial[0]);
            setDuplicates([]);
            setResults([]);
          } else {
            const grouped = {};
            partial.forEach(s => {
              if (!grouped[s.name]) grouped[s.name] = [];
              grouped[s.name].push(s);
            });
            setResults(Object.entries(grouped).slice(0, 20));
            setDuplicates([]);
            setSelectedStudent(null);
          }
        } else {
          setResults([]);
          setDuplicates([]);
          setSelectedStudent(null);
        }
      }
      return;
    }
    const matched = searchStudents(meritData, query);
    const exactName = matched.filter(s => s.name.toLowerCase() === q.toLowerCase());
    if (exactName.length === 1) {
      setSelectedStudent(exactName[0]);
      setDuplicates([]);
      setResults([]);
    } else if (exactName.length > 1) {
      setDuplicates(exactName);
      setSelectedStudent(null);
      setResults([]);
    } else {
      setDuplicates([]);
      setSelectedStudent(null);
      if (matched.length > 0) {
        const grouped = {};
        matched.forEach(s => {
          if (!grouped[s.name]) grouped[s.name] = [];
          grouped[s.name].push(s);
        });
        setResults(Object.entries(grouped).slice(0, 20));
      } else {
        setResults([]);
      }
    }
  };

  const selectStudent = (s) => {
    setSelectedStudent(s);
    setDuplicates([]);
    setResults([]);
    setQuery(s.name);
  };

  const matchedCutoffs = useMemo(() => {
    if (!selectedStudent || !cutoffData.length) return [];
    return cutoffData.filter(c => matchesCutoff(selectedStudent, c));
  }, [selectedStudent, cutoffData]);

  const availableFilters = useMemo(() => {
    if (!matchedCutoffs.length) return null;
    return {
      branches: [...new Map(matchedCutoffs.map(c => [c.branch, true])).keys()].sort(),
      cities: [...new Set(matchedCutoffs.map(c => {
        const m = c.instituteName.match(/,\s*([^,(]+)/);
        return m ? m[1].trim() : '';
      }).filter(Boolean))].sort(),
    };
  }, [matchedCutoffs]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getCity = (name) => {
    const m = name.match(/,\s*([^,(]+)/);
    return m ? m[1].trim() : '';
  };

  // Safe / Target / Reach Prediction Logic (Preserved exactly as before)
  const predictedColleges = useMemo(() => {
    if (!selectedStudent) return { safe: [], target: [], reach: [] };
    let list = [...matchedCutoffs];

    if (filters.branches.length > 0) {
      list = list.filter(c => filters.branches.includes(c.branch));
    }
    if (filters.cities.length > 0) {
      list = list.filter(c => filters.cities.includes(getCity(c.instituteName)));
    }
    if (filters.type !== 'all') {
      list = list.filter(c => {
        const t = c.instituteType;
        if (filters.type === 'Government') return t === 'GOVT' || t === 'AIDED';
        if (filters.type === 'Private') return t === 'PRIVATE' || t === 'S.F.I.';
        return true;
      });
    }
    if (filters.tfw) {
      list = list.filter(c => c.fw === 'Y' || c.allottedCategory.includes('/F'));
    }
    if (filters.genPool) {
      list = list.filter(c => c.allottedCategory.includes('/OP') || c.allottedCategory === 'UR/X/OP');
    }

    const jeeRank = selectedStudent.jeeRank;
    const safe = [];
    const target = [];
    const reach = [];

    for (const c of list) {
      const diff = jeeRank - c.closingRank;
      if (diff <= 0) {
        safe.push(c);
      } else if (diff <= c.closingRank * 0.25) {
        target.push(c);
      } else {
        reach.push(c);
      }
    }

    return {
      safe: safe.sort((a, b) => a.closingRank - b.closingRank),
      target: target.sort((a, b) => a.closingRank - b.closingRank),
      reach: reach.sort((a, b) => a.closingRank - b.closingRank),
    };
  }, [selectedStudent, matchedCutoffs, filters]);

  const isSelectedOwnerLocked = selectedStudent && isOwnerLocked(selectedStudent.name) && !isUnlocked;

  return (
    <div className="app">
      {/* Decorative ambient CSS blobs (No JS animation) */}
      <div className="ambient-blob blob-top-left" aria-hidden="true"></div>
      <div className="ambient-blob blob-bottom-right" aria-hidden="true"></div>

      {/* Sticky Top Bar */}
      <nav className="top-nav" aria-label="Main Navigation">
        <div className="nav-container">
          <div className="nav-brand" onClick={() => { setActiveTab('predictor'); setSelectedStudent(null); }}>
            <span className="brand-logo-mark" aria-hidden="true">🌸</span>
            <div className="brand-titles">
              <span className="brand-title">MPDET 2026</span>
              <span className="brand-badge">Counseling & Hostel</span>
            </div>
          </div>

          <div className="nav-actions">
            {isUnlocked ? (
              <button
                className="btn-nav-lock unlocked"
                onClick={lock}
                title="Private data unlocked. Click to lock again."
                aria-label="Lock private data"
              >
                <span className="lock-dot"></span>
                <span>Unlocked</span>
                <span className="lock-icon" aria-hidden="true">🔓</span>
              </button>
            ) : (
              <button
                className="btn-nav-lock locked"
                onClick={openUnlockModal}
                title="Private records locked. Click to unlock with password."
                aria-label="Unlock private records"
              >
                <span>Encrypted</span>
                <span className="lock-icon" aria-hidden="true">🔒</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="content">
        <header className="header">
          <h1>MPDET Predictor & Hostel Allotment 2026</h1>
          <p className="subtitle">
            Directorate of Technical Education, MP & UIT RGPV APJ Abdul Kalam Boys Hostel
          </p>
        </header>

        {/* Tab Segmented Control */}
        <div className="tab-segmented-control" role="tablist" aria-label="Application Sections">
          <button
            role="tab"
            aria-selected={activeTab === 'predictor'}
            className={`tab-segment-btn ${activeTab === 'predictor' ? 'active' : ''}`}
            onClick={() => setActiveTab('predictor')}
          >
            <span>🎯 College Predictor</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'hostel'}
            className={`tab-segment-btn ${activeTab === 'hostel' ? 'active' : ''}`}
            onClick={() => setActiveTab('hostel')}
          >
            <span>🏢 Hostel Allotment</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'info'}
            className={`tab-segment-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <span>📋 Hostel Info & Rules</span>
          </button>
        </div>

        {/* TAB 1: COLLEGE PREDICTOR */}
        {activeTab === 'predictor' && (
          <div className="tab-panel">
            <div className="search-section card">
              <div className="search-mode" role="group" aria-label="Search Mode">
                <button
                  type="button"
                  className={`mode-btn ${searchMode === 'name' ? 'active' : ''}`}
                  onClick={() => setSearchMode('name')}
                >
                  Name Search
                </button>
                <button
                  type="button"
                  className={`mode-btn ${searchMode === 'roll' ? 'active' : ''}`}
                  onClick={() => setSearchMode('roll')}
                >
                  Application / Roll No
                </button>
              </div>

              <div className="search-row">
                <input
                  type="text"
                  className="search-input"
                  placeholder={
                    searchMode === 'name'
                      ? 'Enter student name (e.g., Aditya, Ram)...'
                      : 'Enter Application No or JEE Roll No...'
                  }
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  aria-label="Student search query"
                />
                <button
                  type="button"
                  className="btn btn-primary search-btn"
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Search'}
                </button>
              </div>
            </div>

            {loading && (
              <div className="card loading-card">
                <div className="spinner"></div>
                <p>
                  Loading data...
                  {loadStatus.merit ? '' : ' merit list'}
                  {loadStatus.cutoff ? '' : ' cutoffs'}
                  {loadStatus.hostel ? '' : ' hostel'}
                </p>
              </div>
            )}

            {duplicates.length > 0 && (
              <div className="card duplicate-card">
                <h3>Multiple students found with name "{query}"</h3>
                <p>Please select your application number / rank:</p>
                <div className="duplicate-list">
                  {duplicates.map((s, i) => (
                    <div key={i} className="duplicate-item" onClick={() => selectStudent(s)}>
                      <span className="dup-name">{s.name}</span>
                      <span className="dup-detail">
                        Rank: {s.rank} | Roll: {s.rollNo} | {s.category} | {s.gender === 'M' ? 'Male' : 'Female'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.length > 0 && !selectedStudent && !duplicates.length && (
              <div className="card results-card">
                <h3>Search results for "{query}"</h3>
                <div className="results-list">
                  {results.map(([name, students], i) => (
                    <div
                      key={i}
                      className="result-item"
                      onClick={() => {
                        if (students.length === 1) {
                          selectStudent(students[0]);
                        } else {
                          setDuplicates(students);
                          setQuery(name);
                        }
                      }}
                    >
                      <span className="result-name">{name}</span>
                      <span className="result-count">
                        {students.length} student{students.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedStudent && (
              <>
                {/* Merit Details Profile */}
                <div className="card merit-card">
                  <div className="merit-header-row">
                    <h2 className="section-title" style={{ border: 'none', padding: 0, margin: 0 }}>
                      Merit Details
                    </h2>
                    {isOwnerLocked(selectedStudent.name) && (
                      <span className="badge badge-pink">Owner Profile</span>
                    )}
                  </div>

                  {isSelectedOwnerLocked ? (
                    <div className="owner-locked-notice">
                      <div className="lock-icon-lg">🔒</div>
                      <h3>Profile Details Protected</h3>
                      <p>
                        This candidate profile is configured as protected. Enter the owner password to view full rank, JEE credentials, and category details.
                      </p>
                      <button className="btn btn-primary" onClick={openUnlockModal}>
                        Unlock Profile Details
                      </button>
                    </div>
                  ) : (
                    <div className="merit-grid">
                      <div className="merit-item">
                        <span className="merit-label">Name</span>
                        <span className="merit-value">{selectedStudent.name}</span>
                      </div>
                      <div className="merit-item">
                        <span className="merit-label">Merit Rank</span>
                        <span className="merit-value highlight">{selectedStudent.rank}</span>
                      </div>
                      <div className="merit-item">
                        <span className="merit-label">JEE Common Rank</span>
                        <span className="merit-value">{selectedStudent.jeeRank?.toLocaleString()}</span>
                      </div>
                      <div className="merit-item">
                        <span className="merit-label">JEE Roll No</span>
                        <span className="merit-value">{selectedStudent.rollNo}</span>
                      </div>
                      <div className="merit-item">
                        <span className="merit-label">Category</span>
                        <span className="merit-value">{selectedStudent.category}</span>
                      </div>
                      <div className="merit-item">
                        <span className="merit-label">Gender</span>
                        <span className="merit-value">{selectedStudent.gender === 'M' ? 'Male' : 'Female'}</span>
                      </div>
                      <div className="merit-item">
                        <span className="merit-label">M.P. Domicile</span>
                        <span className="merit-value">{selectedStudent.domicile === 'Y' ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="merit-item">
                        <span className="merit-label">EWS</span>
                        <span className="merit-value">{selectedStudent.ews === 'Y' ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="merit-item">
                        <span className="merit-label">Fee Waiver (TFW)</span>
                        <span className="merit-value">{selectedStudent.feeWaiver === 'Y' ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="merit-item">
                        <span className="merit-label">Pool</span>
                        <span className="merit-value">{selectedStudent.feeWaiver === 'Y' ? 'TFW' : 'General'}</span>
                      </div>
                      <div className="merit-item">
                        <span className="merit-label">Subject Group</span>
                        <span className="merit-value">{selectedStudent.subjectGroup}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Integrated Hostel Allotment Card for Student Profile */}
                {!isSelectedOwnerLocked && (
                  <HostelCard
                    student={selectedStudent}
                    hostelRecords={hostelData}
                    onNavigateToHostelTab={() => setActiveTab('hostel')}
                  />
                )}

                {/* College Predictor Section */}
                {!isSelectedOwnerLocked && (
                  <div className="card predictor-card">
                    <h2 className="section-title">
                      College Predictor
                      <span className="cutoff-note">
                        Based on {cutoffData.length} cutoff rows from {new Set(cutoffData.map(c => c.instituteName)).size} colleges
                      </span>
                    </h2>

                    <div className="filters-section">
                      <h3>Refine College Options</h3>
                      <div className="filters-row">
                        <div className="filter-group">
                          <label>Branch</label>
                          <select
                            multiple
                            value={filters.branches}
                            onChange={e => {
                              const opts = [...e.target.options].filter(o => o.selected).map(o => o.value);
                              handleFilterChange('branches', opts);
                            }}
                          >
                            {availableFilters?.branches.map(b => (
                              <option key={b} value={b}>{branchFullNames[b] || b}</option>
                            ))}
                          </select>
                        </div>

                        <div className="filter-group">
                          <label>City</label>
                          <select
                            multiple
                            value={filters.cities}
                            onChange={e => {
                              const opts = [...e.target.options].filter(o => o.selected).map(o => o.value);
                              handleFilterChange('cities', opts);
                            }}
                          >
                            {availableFilters?.cities.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div className="filter-group">
                          <label>College Type</label>
                          <select value={filters.type} onChange={e => handleFilterChange('type', e.target.value)}>
                            <option value="all">All Types</option>
                            <option value="Government">Government / Aided</option>
                            <option value="Private">Private / Self-Financed</option>
                          </select>
                        </div>

                        <div className="filter-group checkbox-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={filters.tfw}
                              onChange={e => handleFilterChange('tfw', e.target.checked)}
                            />
                            TFW Seats Only
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={filters.genPool}
                              onChange={e => handleFilterChange('genPool', e.target.checked)}
                            />
                            General Pool (/OP) Only
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="predictor-tabs">
                      {/* SAFE COLLEGES */}
                      <div className="tab-content">
                        <h3 className="tab-title safe">
                          🟢 Safe Colleges ({predictedColleges.safe.length})
                        </h3>
                        {predictedColleges.safe.length === 0 ? (
                          <p className="empty-msg">No safe colleges match your filters.</p>
                        ) : (
                          <div className="college-list">
                            {predictedColleges.safe.slice(0, 25).map((c, i) => (
                              <div key={i} className="college-item safe-item">
                                <div className="college-name">{c.instituteName.replace(/\s*\(\d+\)$/, '')}</div>
                                <div className="college-details">
                                  <span>{branchFullNames[c.branch] || c.branch}</span>
                                  <span>Closing Rank: {c.closingRank?.toLocaleString()}</span>
                                  <span>Your Rank: {selectedStudent.jeeRank?.toLocaleString()}</span>
                                  <span>{getCity(c.instituteName)}</span>
                                  <span>{c.instituteType}</span>
                                  <span>{c.allottedCategory}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* TARGET COLLEGES */}
                      <div className="tab-content">
                        <h3 className="tab-title target">
                          🟡 Target Colleges ({predictedColleges.target.length})
                        </h3>
                        {predictedColleges.target.length === 0 ? (
                          <p className="empty-msg">No target colleges match your filters.</p>
                        ) : (
                          <div className="college-list">
                            {predictedColleges.target.slice(0, 25).map((c, i) => (
                              <div key={i} className="college-item target-item">
                                <div className="college-name">{c.instituteName.replace(/\s*\(\d+\)$/, '')}</div>
                                <div className="college-details">
                                  <span>{branchFullNames[c.branch] || c.branch}</span>
                                  <span>Closing Rank: {c.closingRank?.toLocaleString()}</span>
                                  <span>Your Rank: {selectedStudent.jeeRank?.toLocaleString()}</span>
                                  <span>{getCity(c.instituteName)}</span>
                                  <span>{c.instituteType}</span>
                                  <span>{c.allottedCategory}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* REACH COLLEGES */}
                      <div className="tab-content">
                        <h3 className="tab-title reach">
                          🔴 Reach Colleges ({predictedColleges.reach.length})
                        </h3>
                        {predictedColleges.reach.length === 0 ? (
                          <p className="empty-msg">No reach colleges match your filters.</p>
                        ) : (
                          <div className="college-list">
                            {predictedColleges.reach.slice(0, 25).map((c, i) => (
                              <div key={i} className="college-item reach-item">
                                <div className="college-name">{c.instituteName.replace(/\s*\(\d+\)$/, '')}</div>
                                <div className="college-details">
                                  <span>{branchFullNames[c.branch] || c.branch}</span>
                                  <span>Closing Rank: {c.closingRank?.toLocaleString()}</span>
                                  <span>Your Rank: {selectedStudent.jeeRank?.toLocaleString()}</span>
                                  <span>{getCity(c.instituteName)}</span>
                                  <span>{c.instituteType}</span>
                                  <span>{c.allottedCategory}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-secondary new-search-btn"
                  onClick={() => {
                    setSelectedStudent(null);
                    setDuplicates([]);
                    setResults([]);
                    setQuery('');
                  }}
                >
                  ← New Student Search
                </button>
              </>
            )}
          </div>
        )}

        {/* TAB 2: HOSTEL DIRECTORY */}
        {activeTab === 'hostel' && (
          <div className="tab-panel">
            <HostelTab
              hostelRecords={hostelData}
              loading={loading && hostelData.length === 0}
              error={hostelError}
            />
          </div>
        )}

        {/* TAB 3: HOSTEL INFO & RULES */}
        {activeTab === 'info' && (
          <div className="tab-panel">
            <HostelInfo />
          </div>
        )}
      </main>

      {/* Global Accessible Unlock Modal */}
      <UnlockModal />
    </div>
  );
}

export default App;
