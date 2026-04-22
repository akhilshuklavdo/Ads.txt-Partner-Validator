import { useState, useEffect, useMemo, ReactNode, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Search, 
  Settings, 
  FileText,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { Partner, AnalysisResult, AnalysisStatus } from './types';
import DEFAULT_PARTNERS from './partners.json';

const STORAGE_KEY = 'ads_txt_partners';

export default function App() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [activeTab, setActiveTab] = useState<'check' | 'manage'>('check');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [adsTxtContent, setAdsTxtContent] = useState('');
  const [results, setResults] = useState<AnalysisResult[]>([]);

  // Load partners from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPartners(JSON.parse(saved));
      } catch (e) {
        setPartners(DEFAULT_PARTNERS);
      }
    } else {
      setPartners(DEFAULT_PARTNERS);
    }
  }, []);

  // Save partners to localStorage
  useEffect(() => {
    if (partners.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(partners));
    }
  }, [partners]);

  const handleAddPartner = (name: string, linesStr: string) => {
    const lines = linesStr.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    if (!name || lines.length === 0) return;

    const newPartner: Partner = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      name,
      lines
    };
    setPartners([...partners, newPartner]);
  };

  const handleDeletePartner = (id: string) => {
    setPartners(partners.filter(p => p.id !== id));
  };

  const analyzeAdsTxt = () => {
    const inputLines = adsTxtContent
      .split('\n')
      .map(l => l.trim().toLowerCase())
      .filter(l => l && !l.startsWith('#'));

    const analysis: AnalysisResult[] = partners.map(partner => {
      const partnerLines = partner.lines.map(l => l.trim().toLowerCase());
      const primaryLine = partnerLines[0];
      const secondaryLines = partnerLines.slice(1);

      const hasPrimary = inputLines.some(l => l.includes(primaryLine) || primaryLine.includes(l));
      
      // More robust matching: check if the core parts (domain, id) match
      const isLinePresent = (pLine: string) => {
        return inputLines.some(iLine => {
          // Simple inclusion check for now, can be more complex
          return iLine.includes(pLine) || pLine.includes(iLine);
        });
      };

      const foundPrimary = isLinePresent(primaryLine);
      const foundSecondary = secondaryLines.filter(l => isLinePresent(l));
      const missingSecondary = secondaryLines.filter(l => !isLinePresent(l));

      let status: AnalysisStatus = 'none';
      if (foundPrimary) {
        status = missingSecondary.length === 0 ? 'all' : 'partial';
      }

      return {
        partner,
        status,
        foundLines: foundPrimary ? [partner.lines[0], ...foundSecondary] : [],
        missingLines: foundPrimary ? missingSecondary : partner.lines
      };
    });

    setResults(analysis);
  };

  const categorizedResults = useMemo(() => {
    return {
      all: results.filter(r => r.status === 'all'),
      partial: results.filter(r => r.status === 'partial'),
      none: results.filter(r => r.status === 'none')
    };
  }, [results]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-line p-6 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-ink text-bg p-2 rounded-sm">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="font-mono text-lg font-bold tracking-tighter uppercase">Ads.txt Validator</h1>
            <p className="col-header">Demand Partner Verification Engine</p>
          </div>
        </div>
        
        <nav className="flex gap-1 bg-ink/5 p-1 rounded-sm">
          <button 
            onClick={() => setActiveTab('check')}
            className={`px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all ${activeTab === 'check' ? 'bg-ink text-bg shadow-sm' : 'hover:bg-ink/10'}`}
          >
            Check ads.txt
          </button>
          <button 
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all ${activeTab === 'manage' ? 'bg-ink text-bg shadow-sm' : 'hover:bg-ink/10'}`}
          >
            Manage Partners
          </button>
        </nav>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-10">
        <AnimatePresence mode="wait">
          {activeTab === 'check' ? (
            <motion.div 
              key="check"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <section className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="space-y-2">
                    <label className="col-header block">Website URL (Optional)</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                      <input 
                        type="text" 
                        placeholder="example.com"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        className="w-full bg-white border border-line/20 p-3 pl-10 font-mono text-sm focus:outline-none focus:border-line transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="col-header block">Ads.txt Content</label>
                    <textarea 
                      placeholder="Paste ads.txt content here..."
                      value={adsTxtContent}
                      onChange={(e) => setAdsTxtContent(e.target.value)}
                      className="w-full h-64 bg-white border border-line/20 p-4 font-mono text-xs leading-relaxed focus:outline-none focus:border-line transition-colors resize-none"
                    />
                  </div>

                  <button 
                    onClick={analyzeAdsTxt}
                    disabled={!adsTxtContent}
                    className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Run Analysis
                  </button>
                </div>

                <div className="lg:col-span-2 space-y-8">
                  {results.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center border border-dashed border-line/20 rounded-sm opacity-40 p-12 text-center space-y-4">
                      <Info size={48} strokeWidth={1} />
                      <div className="space-y-1">
                        <p className="font-mono text-sm uppercase tracking-wider">No Analysis Performed</p>
                        <p className="text-xs">Paste ads.txt content and click "Run Analysis" to see results.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white border-l-2 border-accent-green p-4 space-y-1">
                          <p className="col-header">All Present</p>
                          <p className="text-2xl font-mono font-bold">{categorizedResults.all.length}</p>
                        </div>
                        <div className="bg-white border-l-2 border-accent-amber p-4 space-y-1">
                          <p className="col-header">Partial</p>
                          <p className="text-2xl font-mono font-bold">{categorizedResults.partial.length}</p>
                        </div>
                        <div className="bg-white border-l-2 border-accent-rose p-4 space-y-1">
                          <p className="col-header">Not Present</p>
                          <p className="text-2xl font-mono font-bold">{categorizedResults.none.length}</p>
                        </div>
                      </div>

                      {/* Detailed Results Table */}
                      <div className="space-y-6">
                        <ResultSection 
                          title="All Lines Present" 
                          results={categorizedResults.all} 
                          color="text-accent-green"
                          icon={<CheckCircle2 size={16} />}
                        />
                        <ResultSection 
                          title="Only Primary Line Present" 
                          results={categorizedResults.partial} 
                          color="text-accent-amber"
                          icon={<AlertCircle size={16} />}
                        />
                        <ResultSection 
                          title="Not Present" 
                          results={categorizedResults.none} 
                          color="text-accent-rose"
                          icon={<XCircle size={16} />}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div 
              key="manage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <PartnerManager 
                partners={partners} 
                onAdd={handleAddPartner} 
                onDelete={handleDeletePartner} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-line p-6 bg-white/30">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <p className="col-header">Ads.txt Validator v1.0</p>
          <p className="col-header">Built for Precision</p>
        </div>
      </footer>
    </div>
  );
}

function ResultSection({ title, results, color, icon }: { title: string, results: AnalysisResult[], color: string, icon: ReactNode }) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 ${color}`}>
        {icon}
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest">{title}</h3>
        <span className="h-px flex-1 bg-line/10"></span>
        <span className="font-mono text-[10px] opacity-50">({results.length})</span>
      </div>
      
      <div className="bg-white border border-line/10 overflow-hidden">
        <div className="data-row grid-cols-[1.5fr_2fr_1fr] bg-ink/5 py-2 px-4">
          <span className="col-header">Partner Name</span>
          <span className="col-header">Primary Line</span>
          <span className="col-header text-right">Status</span>
        </div>
        {results.map((res, idx) => (
          <div key={idx} className="data-row grid-cols-[1.5fr_2fr_1fr] py-3 px-4 group">
            <span className="font-medium text-sm">{res.partner.name}</span>
            <span className="data-value truncate opacity-70" title={res.partner.lines[0]}>
              {res.partner.lines[0]}
            </span>
            <div className="flex justify-end items-center gap-2">
              {res.status === 'partial' && (
                <span className="text-[10px] font-mono bg-accent-amber/10 text-accent-amber px-1.5 py-0.5 rounded-sm">
                  {res.partner.lines.length - res.foundLines.length} Missing
                </span>
              )}
              <span className={`text-[10px] font-mono uppercase tracking-tighter ${color}`}>
                {res.status === 'all' ? 'Verified' : res.status === 'partial' ? 'Incomplete' : 'Missing'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartnerManager({ partners, onAdd, onDelete }: { partners: Partner[], onAdd: (name: string, lines: string) => void, onDelete: (id: string) => void }) {
  const [name, setName] = useState('');
  const [lines, setLines] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onAdd(name, lines);
    setName('');
    setLines('');
    setIsAdding(false);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white border border-line/20 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-sm font-bold uppercase tracking-widest">Add New Partner</h2>
            <Settings size={16} className="opacity-30" />
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="col-header block">Partner Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. OpenX"
                className="w-full bg-bg/50 border border-line/10 p-3 font-mono text-sm focus:outline-none focus:border-line transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              <label className="col-header block">Ads.txt Lines</label>
              <p className="text-[10px] opacity-50 italic -mt-1">First line is considered the Primary Line.</p>
              <textarea 
                value={lines}
                onChange={(e) => setLines(e.target.value)}
                placeholder="domain.com, ID, TYPE, TAG"
                className="w-full h-48 bg-bg/50 border border-line/10 p-3 font-mono text-xs focus:outline-none focus:border-line transition-colors resize-none"
              />
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
              <Plus size={16} />
              Save Partner
            </button>
          </form>
        </div>

        <div className="bg-ink text-bg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Info size={16} />
            <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold">Guidelines</h3>
          </div>
          <ul className="space-y-3 text-xs opacity-80 font-light leading-relaxed">
            <li>• The <strong>Primary Line</strong> is the first line you enter. Validation fails if this is missing.</li>
            <li>• <strong>Secondary Lines</strong> are additional lines required for full verification.</li>
            <li>• Comments starting with <code>#</code> are automatically ignored.</li>
            <li>• Data is stored locally in your browser.</li>
          </ul>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest">Saved Partners ({partners.length})</h2>
        </div>

        <div className="grid gap-4">
          {partners.map(partner => (
            <div key={partner.id} className="bg-white border border-line/10 p-5 group hover:border-line/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg tracking-tight">{partner.name}</h3>
                  <p className="col-header">{partner.lines.length} total lines configured</p>
                </div>
                <button 
                  onClick={() => onDelete(partner.id)}
                  className="text-accent-rose opacity-0 group-hover:opacity-100 p-2 hover:bg-accent-rose/10 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono uppercase bg-ink text-bg px-1.5 py-0.5">Primary</span>
                  <code className="text-xs font-mono opacity-70 truncate">{partner.lines[0]}</code>
                </div>
                {partner.lines.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono uppercase bg-line/10 text-ink/50 px-1.5 py-0.5">Secondary</span>
                    <code className="text-xs font-mono opacity-40 truncate">+{partner.lines.length - 1} more lines</code>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {partners.length === 0 && (
            <div className="text-center py-20 border border-dashed border-line/20 opacity-30">
              <p className="font-mono text-sm uppercase tracking-widest">No partners saved</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
