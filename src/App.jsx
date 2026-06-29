import { useState, useEffect, useMemo } from 'react';
import Ferrofluid from './Ferrofluid';
import { loadMeritData, loadCutoffData, searchStudents, matchesCutoff, branchFullNames } from './dataLoader';
import './App.css';

function App() {
  const [meritData, setMeritData] = useState([]);
  const [cutoffData, setCutoffData] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [loadStatus, setLoadStatus] = useState({ merit: false, cutoff: false });
  const [locked, setLocked] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const SECRET_CODE = '62618085';
  const isSecretName = (name) => name?.toLowerCase() === 'pratham dahiya';

  useEffect(() => {
    Promise.all([
      loadMeritData().then(d => {
        setMeritData(d);
        setLoadStatus(p => ({ ...p, merit: true }));
      }),
      loadCutoffData().then(d => {
        setCutoffData(d);
        setLoadStatus(p => ({ ...p, cutoff: true }));
      })
    ]).then(() => setLoading(false));
  }, []);

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
    if (isSecretName(s.name)) {
      setLocked(true);
      setCodeInput('');
    } else {
      setLocked(false);
    }
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

  return (
    <div className="app">
      <div className="bg-layer">
        <Ferrofluid
          colors={["#1a1a2e", "#16213e", "#0f3460"]}
          speed={0.3}
          scale={1.8}
          turbulence={0.8}
          fluidity={0.15}
          rimWidth={0.15}
          sharpness={3}
          shimmer={1}
          glow={1.5}
          flowDirection="down"
          opacity={0.6}
          mouseInteraction={true}
          mouseStrength={0.8}
          mouseRadius={0.3}
        />
      </div>

      <div className="content">
        <header className="header">
          <h1>MPDET College Predictor 2026</h1>
          <p className="subtitle">Directorate of Technical Education, Madhya Pradesh</p>
        </header>

        <div className="search-section card">
          <div className="search-mode">
            <button
              className={`mode-btn ${searchMode === 'name' ? 'active' : ''}`}
              onClick={() => setSearchMode('name')}
            >
              Name Search
            </button>
            <button
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
              placeholder={searchMode === 'name' ? 'Enter student name...' : 'Enter Application No or JEE Roll No...'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button className="search-btn" onClick={handleSearch} disabled={loading}>
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
              {loadStatus.cutoff ? '' : ' college cutoffs'}
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
                  <span className="dup-detail">Rank: {s.rank} | Roll: {s.rollNo} | {s.category} | {s.gender === 'M' ? 'Male' : 'Female'}</span>
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
                <div key={i} className="result-item" onClick={() => {
                  if (students.length === 1) {
                    selectStudent(students[0]);
                  } else {
                    setDuplicates(students);
                    setQuery(name);
                  }
                }}>
                  <span className="result-name">{name}</span>
                  <span className="result-count">{students.length} student{students.length > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedStudent && locked && codeInput !== SECRET_CODE && (
          <div className="card lock-card">
            <div className="lock-icon">🔒</div>
            <h3>Data Not Available</h3>
            <p>This profile is private. Enter the owner code to view details.</p>
            <input
              type="password"
              className="code-input"
              placeholder="Enter code..."
              value={codeInput}
              onChange={e => setCodeInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setCodeInput(e.target.value); }}
              autoFocus
            />
            {codeInput && codeInput !== SECRET_CODE && (
              <p className="code-error">Incorrect code</p>
            )}
            <button className="new-search-btn lock-back-btn" onClick={() => {
              setSelectedStudent(null);
              setDuplicates([]);
              setResults([]);
              setQuery('');
              setLocked(false);
              setCodeInput('');
            }}>
              Back to Search
            </button>
          </div>
        )}

        {selectedStudent && (!locked || codeInput === SECRET_CODE) && (
          <>
            <div className="card merit-card">
              <h2 className="section-title">Your Merit Details</h2>
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
                  <span className="merit-value">{selectedStudent.jeeRank}</span>
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
            </div>

            <div className="card predictor-card">
              <h2 className="section-title">College Predictor
                <span className="cutoff-note">Based on {cutoffData.length} cutoff rows from {new Set(cutoffData.map(c => c.instituteName)).size} colleges</span>
              </h2>

              <div className="filters-section">
                <h3>Filters</h3>
                <div className="filters-row">
                  <div className="filter-group">
                    <label>Branch</label>
                    <select multiple value={filters.branches} onChange={e => {
                      const opts = [...e.target.options].filter(o => o.selected).map(o => o.value);
                      handleFilterChange('branches', opts);
                    }}>
                      {availableFilters?.branches.map(b => (
                        <option key={b} value={b}>{branchFullNames[b] || b}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>City</label>
                    <select multiple value={filters.cities} onChange={e => {
                      const opts = [...e.target.options].filter(o => o.selected).map(o => o.value);
                      handleFilterChange('cities', opts);
                    }}>
                      {availableFilters?.cities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>College Type</label>
                    <select value={filters.type} onChange={e => handleFilterChange('type', e.target.value)}>
                      <option value="all">All</option>
                      <option value="Government">Government</option>
                      <option value="Private">Private</option>
                    </select>
                  </div>

                  <div className="filter-group checkbox-group">
                    <label>
                      <input type="checkbox" checked={filters.tfw} onChange={e => handleFilterChange('tfw', e.target.checked)} />
                      TFW Only
                    </label>
                    <label>
                      <input type="checkbox" checked={filters.genPool} onChange={e => handleFilterChange('genPool', e.target.checked)} />
                      General Pool Only
                    </label>
                  </div>
                </div>
              </div>

              <div className="predictor-tabs">
                <div className="tab-content">
                  <h3 className="tab-title safe">Safe Colleges ({predictedColleges.safe.length})</h3>
                  {predictedColleges.safe.length === 0 ? (
                    <p className="empty-msg">No safe colleges match your filters.</p>
                  ) : (
                    <div className="college-list">
                      {predictedColleges.safe.slice(0, 20).map((c, i) => (
                        <div key={i} className="college-item safe-item">
                          <div className="college-name">{c.instituteName.replace(/\s*\(\d+\)$/, '')}</div>
                          <div className="college-details">
                            <span>{branchFullNames[c.branch] || c.branch}</span>
                            <span>Closing: {c.closingRank?.toLocaleString()}</span>
                            <span>Your JEE Rank: {selectedStudent.jeeRank?.toLocaleString()}</span>
                            <span>{getCity(c.instituteName)}</span>
                            <span>{c.instituteType}</span>
                            <span>{c.allottedCategory}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="tab-content">
                  <h3 className="tab-title target">Target Colleges ({predictedColleges.target.length})</h3>
                  {predictedColleges.target.length === 0 ? (
                    <p className="empty-msg">No target colleges match your filters.</p>
                  ) : (
                    <div className="college-list">
                      {predictedColleges.target.slice(0, 20).map((c, i) => (
                        <div key={i} className="college-item target-item">
                          <div className="college-name">{c.instituteName.replace(/\s*\(\d+\)$/, '')}</div>
                          <div className="college-details">
                            <span>{branchFullNames[c.branch] || c.branch}</span>
                            <span>Closing: {c.closingRank?.toLocaleString()}</span>
                            <span>Your JEE Rank: {selectedStudent.jeeRank?.toLocaleString()}</span>
                            <span>{getCity(c.instituteName)}</span>
                            <span>{c.instituteType}</span>
                            <span>{c.allottedCategory}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="tab-content">
                  <h3 className="tab-title reach">Reach Colleges ({predictedColleges.reach.length})</h3>
                  {predictedColleges.reach.length === 0 ? (
                    <p className="empty-msg">No reach colleges match your filters.</p>
                  ) : (
                    <div className="college-list">
                      {predictedColleges.reach.slice(0, 20).map((c, i) => (
                        <div key={i} className="college-item reach-item">
                          <div className="college-name">{c.instituteName.replace(/\s*\(\d+\)$/, '')}</div>
                          <div className="college-details">
                            <span>{branchFullNames[c.branch] || c.branch}</span>
                            <span>Closing: {c.closingRank?.toLocaleString()}</span>
                            <span>Your JEE Rank: {selectedStudent.jeeRank?.toLocaleString()}</span>
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

            <button className="new-search-btn" onClick={() => {
              setSelectedStudent(null);
              setDuplicates([]);
              setResults([]);
              setQuery('');
              setLocked(false);
              setCodeInput('');
            }}>
              New Search
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
