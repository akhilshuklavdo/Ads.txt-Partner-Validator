import React, { useState, useEffect, useMemo, ReactNode, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X,
  XCircle,
  Search,
  Settings,
  FileText,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  CircleDot,
  Copy,
  Check
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
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);

  // Sorted list of partners for management
  const sortedPartners = useMemo(() => {
    return [...partners].sort((a, b) => a.name.localeCompare(b.name));
  }, [partners]);

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

      const isLinePresent = (pLine: string) => {
        const normalizedPLine = pLine.trim().toLowerCase();
        return inputLines.some(iLine => {
          // Robust matching: check if input line contains all parts of pLine (domain, id)
          // For simplicity, we keep the previous logic but ensure trimmed compare
          return iLine.includes(normalizedPLine) || normalizedPLine.includes(iLine);
        });
      };

      const foundPrimary = isLinePresent(primaryLine);
      const foundSecondary = secondaryLines.filter(l => isLinePresent(l));
      const missingSecondary = secondaryLines.filter(l => !isLinePresent(l));

      let status: AnalysisStatus = 'none';
      if (foundPrimary) {
        status = missingSecondary.length === 0 ? 'all' : 'partial';
      } else if (foundSecondary.length > 0) {
        status = 'any_secondary';
      }

      return {
        partner,
        status,
        foundLines: foundPrimary ? [partner.lines[0], ...foundSecondary] : foundSecondary.map(sl => partner.lines.find(pl => pl.toLowerCase().includes(sl)) || sl),
        missingLines: foundPrimary ? missingSecondary.map(sl => partner.lines.find(pl => pl.toLowerCase().includes(sl)) || sl) : partner.lines.filter(l => !foundSecondary.some(sl => l.toLowerCase().includes(sl)))
      };
    });

    setResults(analysis);
  };

  const categorizedResults = useMemo(() => {
    const sortByName = (a: AnalysisResult, b: AnalysisResult) => a.partner.name.localeCompare(b.partner.name);
    
    return {
      all: results.filter(r => r.status === 'all').sort(sortByName),
      partial: results.filter(r => r.status === 'partial').sort(sortByName),
      any: results.filter(r => r.status === 'any_secondary').sort(sortByName),
      none: results.filter(r => r.status === 'none').sort(sortByName)
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
                      <div className="bg-line/5 p-4 rounded-full">
                        <Info size={48} strokeWidth={1} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-mono text-sm uppercase tracking-wider">No Analysis Performed</p>
                        <p className="text-xs">Paste ads.txt content and click "Run Analysis" to see results.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white border-l-2 border-accent-green p-4 space-y-1 shadow-sm">
                          <p className="col-header">All Present</p>
                          <p className="text-2xl font-mono font-bold">{categorizedResults.all.length}</p>
                        </div>
                        <div className="bg-white border-l-2 border-accent-amber p-4 space-y-1 shadow-sm">
                          <p className="col-header">Primary Only</p>
                          <p className="text-2xl font-mono font-bold">{categorizedResults.partial.length}</p>
                        </div>
                        <div className="bg-white border-l-2 border-blue-500 p-4 space-y-1 shadow-sm">
                          <p className="col-header">Any Segment</p>
                          <p className="text-2xl font-mono font-bold">{categorizedResults.any.length}</p>
                        </div>
                        <div className="bg-white border-l-2 border-accent-rose p-4 space-y-1 shadow-sm">
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
                          borderColor="border-accent-green/20"
                          icon={<CheckCircle2 size={16} />}
                          onRowClick={setSelectedResult}
                        />
                        <ResultSection 
                          title="Only Primary Line Present" 
                          results={categorizedResults.partial} 
                          color="text-accent-amber"
                          borderColor="border-accent-amber/20"
                          icon={<AlertCircle size={16} />}
                          onRowClick={setSelectedResult}
                        />
                         <ResultSection 
                          title="Any Line Present" 
                          results={categorizedResults.any} 
                          color="text-blue-500"
                          borderColor="border-blue-500/20"
                          icon={<CircleDot size={16} />}
                          onRowClick={setSelectedResult}
                        />
                        <ResultSection 
                          title="Not Present" 
                          results={categorizedResults.none} 
                          color="text-accent-rose"
                          borderColor="border-accent-rose/20"
                          icon={<XCircle size={16} />}
                          onRowClick={setSelectedResult}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <AnimatePresence>
                {selectedResult && (
                  <DetailModal 
                    result={selectedResult} 
                    onClose={() => setSelectedResult(null)} 
                  />
                )}
              </AnimatePresence>
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
                partners={sortedPartners} 
                onAdd={handleAddPartner} 
                onDelete={handleDeletePartner} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-line p-6 bg-white/30 mt-auto">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <p className="col-header">Ads.txt Validator v1.1</p>
          <p className="col-header">Built for Precision</p>
        </div>
      </footer>
    </div>
  );
}

const ResultSection: React.FC<{ 
  title: string, 
  results: AnalysisResult[], 
  color: string, 
  borderColor: string, 
  icon: ReactNode,
  onRowClick: (res: AnalysisResult) => void 
}> = ({ title, results, color, borderColor, icon, onRowClick }) => {
  if (results.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 ${color}`}>
        {icon}
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest">{title}</h3>
        <span className="h-px flex-1 bg-current opacity-20"></span>
        <span className="font-mono text-[10px] opacity-50">({results.length})</span>
      </div>
      
      <div className={`bg-white border border-line/10 overflow-hidden shadow-sm`}>
        <div className="data-row grid-cols-[1.5fr_2fr_1fr] bg-ink/5 py-2 px-4 border-b border-line/5">
          <span className="col-header">Partner Name</span>
          <span className="col-header">Primary Line</span>
          <span className="col-header text-right">Status</span>
        </div>
        {results.map((res, idx) => (
          <ResultRow 
            key={res.partner.id} 
            result={res} 
            color={color} 
            isLast={idx === results.length - 1} 
            onClick={() => onRowClick(res)}
          />
        ))}
      </div>
    </div>
  );
};

const ResultRow: React.FC<{ 
  result: AnalysisResult, 
  color: string, 
  isLast: boolean,
  onClick: () => void 
}> = ({ result, color, isLast, onClick }) => {
  return (
    <div className={`${!isLast ? 'border-b border-line/5' : ''}`}>
      <div 
        onClick={onClick}
        className="data-row grid-cols-[1.5fr_2fr_1fr] py-3 px-4 group cursor-pointer hover:bg-ink/5"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm group-hover:underline transition-all underline-offset-2 flex items-center gap-2">
            {result.partner.name}
            <ExternalLink size={10} className="opacity-0 group-hover:opacity-40 transition-opacity" />
          </span>
        </div>
        <span className="data-value truncate opacity-70 font-mono text-[11px]" title={result.partner.lines[0]}>
          {result.partner.lines[0]}
        </span>
        <div className="flex justify-end items-center gap-2">
          {result.status === 'partial' && (
            <span className="text-[10px] font-mono bg-accent-amber/10 text-accent-amber px-1.5 py-0.5 rounded-sm">
              {result.partner.lines.length - result.foundLines.length} Missing
            </span>
          )}
          {result.status === 'any_secondary' && (
             <span className="text-[10px] font-mono bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-sm">
              Primary Missing
           </span>
          )}
          <span className={`text-[10px] font-mono uppercase tracking-tighter ${color}`}>
            {result.status === 'all' ? 'Verified' : result.status === 'partial' ? 'Partial' : result.status === 'any_secondary' ? 'Secondary' : 'Absent'}
          </span>
        </div>
      </div>
    </div>
  );
};

const DetailModal: React.FC<{ result: AnalysisResult, onClose: () => void }> = ({ result, onClose }) => {
  const [copiedFound, setCopiedFound] = useState(false);
  const [copiedMissing, setCopiedMissing] = useState(false);

  const copyLines = async (lines: string[], setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-bg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-line/10 rounded-sm overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-line/10 flex justify-between items-center bg-white">
          <div>
            <h2 className="font-bold text-xl tracking-tight uppercase flex items-center gap-2">
              {result.partner.name}
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                result.status === 'all' ? 'border-accent-green text-accent-green bg-accent-green/5' :
                result.status === 'partial' ? 'border-accent-amber text-accent-amber bg-accent-amber/5' :
                result.status === 'any_secondary' ? 'border-blue-500 text-blue-500 bg-blue-500/5' :
                'border-accent-rose text-accent-rose bg-accent-rose/5'
              }`}>
                {result.status.replace('_', ' ')}
              </span>
            </h2>
            <p className="col-header mt-1">Detailed ads.txt line analysis</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-line/5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid md:grid-cols-2 gap-8 h-full">
            {/* Column 1: Found Lines */}
            <div className="flex flex-col gap-3 min-h-[300px]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-accent-green font-mono text-xs font-bold uppercase tracking-widest">
                  <CheckCircle2 size={16} />
                  Present Lines ({result.foundLines.length})
                </div>
                <button 
                  onClick={() => copyLines(result.foundLines, setCopiedFound)}
                  disabled={result.foundLines.length === 0}
                  className="flex items-center gap-1.5 px-2 py-1 bg-white border border-line/10 rounded-sm font-mono text-[10px] uppercase tracking-tighter hover:bg-line/5 transition-all active:scale-95 disabled:opacity-30"
                >
                  {copiedFound ? <Check size={12} className="text-accent-green" /> : <Copy size={12} />}
                  {copiedFound ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="flex-1 bg-white border border-line/5 p-4 overflow-auto rounded-sm group relative">
                {result.foundLines.length > 0 ? (
                  <div className="space-y-1.5">
                    {result.foundLines.map((line, i) => (
                      <div key={i} className="flex gap-2 font-mono text-[11px] leading-relaxed break-all p-1.5 border-b border-line/5 last:border-0 hover:bg-bg/50 transition-colors">
                        <span className="text-accent-green/40 mt-0.5">•</span>
                        <code className="opacity-80">{line}</code>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-2">
                    <AlertCircle size={24} strokeWidth={1.5} />
                    <p className="font-serif italic text-xs uppercase tracking-widest">No matching lines detected</p>
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Missing Lines */}
            <div className="flex flex-col gap-3 min-h-[300px]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-accent-rose font-mono text-xs font-bold uppercase tracking-widest">
                  <XCircle size={16} />
                  Absent Lines ({result.missingLines.length})
                </div>
                <button 
                  onClick={() => copyLines(result.missingLines, setCopiedMissing)}
                  disabled={result.missingLines.length === 0}
                  className="flex items-center gap-1.5 px-2 py-1 bg-white border border-line/10 rounded-sm font-mono text-[10px] uppercase tracking-tighter hover:bg-line/5 transition-all active:scale-95 disabled:opacity-30"
                >
                  {copiedMissing ? <Check size={12} className="text-accent-green" /> : <Copy size={12} />}
                  {copiedMissing ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="flex-1 bg-accent-rose/5 border border-accent-rose/10 p-4 overflow-auto rounded-sm">
                {result.missingLines.length > 0 ? (
                  <div className="space-y-1.5">
                    {result.missingLines.map((line, i) => (
                      <div key={i} className="flex gap-2 font-mono text-[11px] leading-relaxed break-all p-1.5 border-b border-accent-rose/10 last:border-0 hover:bg-accent-rose/10 transition-colors text-accent-rose">
                        <span className="opacity-40 mt-0.5">•</span>
                        <code className="opacity-90">{line}</code>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-2 text-accent-green">
                    <CheckCircle2 size={24} strokeWidth={1.5} />
                    <p className="font-serif italic text-xs uppercase tracking-widest">All configured lines verified</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const PartnerManager: React.FC<{ partners: Partner[], onAdd: (name: string, lines: string) => void, onDelete: (id: string) => void }> = ({ partners, onAdd, onDelete }) => {
  const [name, setName] = useState('');
  const [lines, setLines] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onAdd(name, lines);
    setName('');
    setLines('');
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white border border-line/20 p-6 space-y-6 shadow-sm">
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
                required
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
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
              <Plus size={16} />
              Save Partner
            </button>
          </form>
        </div>

        <div className="bg-ink text-bg p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Info size={16} />
            <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold">Guidelines</h3>
          </div>
          <ul className="space-y-3 text-xs opacity-80 font-light leading-relaxed">
            <li>• The <strong>Primary Line</strong> is the first line you enter. Validation fails if this is missing.</li>
            <li>• <strong>Any Line Present</strong> category shows partners where only secondary lines matched.</li>
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
            <div key={partner.id} className="bg-white border border-line/10 p-5 group hover:border-line/30 transition-all shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg tracking-tight underline-offset-4 decoration-line/20">{partner.name}</h3>
                  <p className="col-header">{partner.lines.length} total lines configured</p>
                </div>
                <button 
                  onClick={() => onDelete(partner.id)}
                  className="text-accent-rose opacity-0 group-hover:opacity-100 p-2 hover:bg-accent-rose/10 transition-all rounded-sm"
                  title="Delete Partner"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono uppercase bg-ink text-bg px-1.5 py-0.5 rounded-none">Primary</span>
                  <code className="text-[10px] font-mono opacity-70 truncate">{partner.lines[0]}</code>
                </div>
                {partner.lines.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono uppercase bg-line/10 text-ink/50 px-1.5 py-0.5 rounded-none">Secondary</span>
                    <code className="text-[10px] font-mono opacity-40 truncate">+{partner.lines.length - 1} more lines</code>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {partners.length === 0 && (
            <div className="text-center py-20 border border-dashed border-line/20 opacity-30 bg-white/50">
              <p className="font-mono text-sm uppercase tracking-widest">No partners saved</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
