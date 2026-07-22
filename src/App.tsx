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
  Check,
  Download,
  Pencil
} from 'lucide-react';
import { 
  Partner, 
  AnalysisResult, 
  AnalysisStatus,
  getPartnerPrimaryLines,
  getPartnerSecondaryLines,
  getAllPartnerLines
} from './types';
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

  const handleAddPartner = (name: string, primaryLinesStr: string, secondaryLinesStr: string) => {
    const primaryLines = primaryLinesStr.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const secondaryLines = secondaryLinesStr.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    if (!name || (primaryLines.length === 0 && secondaryLines.length === 0)) return;

    const newPartner: Partner = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      name,
      primaryLines,
      secondaryLines,
      lines: [...primaryLines, ...secondaryLines]
    };
    setPartners([...partners, newPartner]);
  };

  const handleDeletePartner = (id: string) => {
    setPartners(partners.filter(p => p.id !== id));
  };

  const handleUpdatePartner = (id: string, name: string, primaryLinesStr: string, secondaryLinesStr: string) => {
    const primaryLines = primaryLinesStr.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const secondaryLines = secondaryLinesStr.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    if (!name || (primaryLines.length === 0 && secondaryLines.length === 0)) return;

    setPartners(partners.map(p => p.id === id ? { 
      ...p, 
      name, 
      primaryLines, 
      secondaryLines, 
      lines: [...primaryLines, ...secondaryLines] 
    } : p));
  };

  const analyzeAdsTxt = () => {
    const rawInputLines = adsTxtContent
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    const normalizeRelationType = (line: string): string => {
      const withoutComment = line.split('#')[0].trim().toLowerCase();
      const parts = withoutComment.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 3) {
        if (parts[2] === 'direct' || parts[2] === 'reseller') {
          parts[2] = 'normalized_relation';
        }
      }
      return parts.join(',');
    };

    const analysis: AnalysisResult[] = partners.map(partner => {
      const primaryLines = getPartnerPrimaryLines(partner);
      const secondaryLines = getPartnerSecondaryLines(partner);

      const findMatchingInputLine = (pLine: string): string | null => {
        const normPLine = normalizeRelationType(pLine);
        if (!normPLine) return null;
        
        const matched = rawInputLines.find(iLine => {
          const normILine = normalizeRelationType(iLine);
          return normILine === normPLine || normILine.includes(normPLine) || normPLine.includes(normILine);
        });
        
        return matched || null;
      };

      const primaryMatches = primaryLines.map(line => ({
        configured: line,
        matched: findMatchingInputLine(line)
      }));

      const secondaryMatches = secondaryLines.map(line => ({
        configured: line,
        matched: findMatchingInputLine(line)
      }));

      const foundPrimary = primaryMatches
        .filter(m => m.matched !== null)
        .map(m => m.matched as string);

      const missingPrimary = primaryMatches
        .filter(m => m.matched === null)
        .map(m => m.configured);

      const foundSecondary = secondaryMatches
        .filter(m => m.matched !== null)
        .map(m => m.matched as string);

      const missingSecondary = secondaryMatches
        .filter(m => m.matched === null)
        .map(m => m.configured);

      const allPrimaryFound = primaryLines.length > 0 && missingPrimary.length === 0;
      const somePrimaryFound = foundPrimary.length > 0;
      const someSecondaryFound = foundSecondary.length > 0;

      let status: AnalysisStatus = 'none';
      if (allPrimaryFound) {
        status = missingSecondary.length === 0 ? 'all' : 'partial';
      } else if (somePrimaryFound || someSecondaryFound) {
        status = 'any_secondary';
      }

      const foundLines = [...foundPrimary, ...foundSecondary];
      const missingLines = [...missingPrimary, ...missingSecondary];

      return {
        partner,
        status,
        foundLines,
        missingLines
      };
    });

    setResults(analysis);
  };


  const downloadAllMissingLines = () => {
    const allMissingLines = results.flatMap(r => r.missingLines);
    if (allMissingLines.length === 0) return;

    // Use a Set to remove duplicates if multiple partners have the same missing line
    const uniqueMissingLines = Array.from(new Set(allMissingLines));
    
    const blob = new Blob([uniqueMissingLines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all_missing_ads_txt_lines.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                        <SummaryCard 
                          label="All Present" 
                          count={categorizedResults.all.length} 
                          borderColor="border-accent-green" 
                          partners={categorizedResults.all} 
                        />
                        <SummaryCard 
                          label="Primary Present" 
                          count={categorizedResults.partial.length} 
                          borderColor="border-accent-amber" 
                          partners={categorizedResults.partial} 
                        />
                        <SummaryCard 
                          label="Any Segment" 
                          count={categorizedResults.any.length} 
                          borderColor="border-blue-500" 
                          partners={categorizedResults.any} 
                          alignRight={true}
                        />
                        <SummaryCard 
                          label="Not Present" 
                          count={categorizedResults.none.length} 
                          borderColor="border-accent-rose" 
                          partners={categorizedResults.none} 
                          alignRight={true}
                        />
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

                      {/* Download All Missing Lines Button */}
                      {results.some(r => r.missingLines.length > 0) && (
                        <div className="pt-4 flex justify-center">
                          <button 
                            onClick={downloadAllMissingLines}
                            className="flex items-center gap-2 px-6 py-3 bg-ink text-bg font-mono text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-md active:scale-95"
                          >
                            <Download size={16} />
                            Download All Missing Lines
                            <span className="ml-2 bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
                              {Array.from(new Set(results.flatMap(r => r.missingLines))).length}
                            </span>
                          </button>
                        </div>
                      )}
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
                onUpdate={handleUpdatePartner}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-line p-6 bg-white/30 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="col-header">Ads.txt Validator v1.1</p>
          <p className="font-mono text-xs font-semibold text-ink/80 tracking-wide">
            Designed and Developed by Akhil Shukla
          </p>
        </div>
      </footer>
    </div>
  );
}


const SummaryCard: React.FC<{
  label: string,
  count: number,
  borderColor: string,
  partners: AnalysisResult[],
  alignRight?: boolean
}> = ({ label, count, borderColor, partners, alignRight }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const names = partners.map(p => p.partner.name).join('\n');
    navigator.clipboard.writeText(names);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative group bg-white border-l-2 ${borderColor} p-4 space-y-1 shadow-sm cursor-help hover:border-r hover:border-y hover:border-line/20 hover:shadow-md transition-all`}>
      <p className="col-header">{label}</p>
      <p className="text-2xl font-mono font-bold">{count}</p>
      
      {/* Popover */}
      <div className={`absolute top-full ${alignRight ? 'right-0' : 'left-0'} mt-2 w-72 bg-white border border-line/20 shadow-xl p-4 z-30 hidden group-hover:block pointer-events-auto text-left rounded-sm transition-all duration-150`}>
        <div className="flex justify-between items-center pb-2 mb-2 border-b border-line/10">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink/60 font-bold">
            {label} ({count})
          </p>
          {partners.length > 0 && (
            <button 
              onClick={handleCopy}
              className="flex items-center gap-1 px-1.5 py-0.5 bg-ink/5 hover:bg-ink text-[9px] font-mono uppercase text-ink hover:text-bg transition-colors rounded-sm cursor-pointer"
              title="Copy all names to clipboard"
            >
              {copied ? 'Copied!' : 'Copy List'}
            </button>
          )}
        </div>
        {partners.length === 0 ? (
          <p className="text-xs text-ink/40 italic">No partners in this category</p>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {partners.map(r => (
              <div 
                key={r.partner.id} 
                className="text-xs py-0.5 font-mono text-ink/80 hover:bg-ink/5 px-1 rounded-sm select-all break-words"
              >
                {r.partner.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

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
          <span className="col-header">Primary Line(s)</span>
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
  const primaryLines = getPartnerPrimaryLines(result.partner);
  const primaryDisplay = primaryLines.length > 0
    ? primaryLines[0] + (primaryLines.length > 1 ? ` (+${primaryLines.length - 1} more primary)` : '')
    : 'No primary lines configured';

  const totalLines = getAllPartnerLines(result.partner).length;

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
        <span className="data-value truncate opacity-70 font-mono text-[11px]" title={primaryLines.join('\n')}>
          {primaryDisplay}
        </span>
        <div className="flex justify-end items-center gap-2">
          {result.status === 'partial' && (
            <span className="text-[10px] font-mono bg-accent-amber/10 text-accent-amber px-1.5 py-0.5 rounded-sm">
              {result.missingLines.length} Missing
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

  const primaryLines = getPartnerPrimaryLines(result.partner);
  const secondaryLines = getPartnerSecondaryLines(result.partner);

  const copyLines = async (lines: string[], setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const isPrimary = (line: string) => {
    const norm = (s: string) => s.split('#')[0].trim().toLowerCase();
    const targetNorm = norm(line);
    return primaryLines.some(pl => norm(pl) === targetNorm || norm(pl).includes(targetNorm) || targetNorm.includes(norm(pl)));
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
            <p className="col-header mt-1">Detailed ads.txt line analysis • {primaryLines.length} Primary line(s), {secondaryLines.length} Secondary line(s)</p>
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
                    {result.foundLines.map((line, i) => {
                      const primary = isPrimary(line);
                      return (
                        <div key={i} className="flex items-start gap-2 font-mono text-[11px] leading-relaxed break-all p-1.5 border-b border-line/5 last:border-0 hover:bg-bg/50 transition-colors">
                          <span className={`text-[9px] font-mono uppercase px-1 py-0.5 rounded shrink-0 ${primary ? 'bg-ink text-bg' : 'bg-line/10 text-ink/60'}`}>
                            {primary ? 'Primary' : 'Secondary'}
                          </span>
                          <code className="opacity-80">{line}</code>
                        </div>
                      );
                    })}
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
                    {result.missingLines.map((line, i) => {
                      const primary = isPrimary(line);
                      return (
                        <div key={i} className="flex items-start gap-2 font-mono text-[11px] leading-relaxed break-all p-1.5 border-b border-accent-rose/10 last:border-0 hover:bg-accent-rose/10 transition-colors text-accent-rose">
                          <span className={`text-[9px] font-mono uppercase px-1 py-0.5 rounded shrink-0 ${primary ? 'bg-accent-rose text-white' : 'bg-accent-rose/20 text-accent-rose'}`}>
                            {primary ? 'Primary' : 'Secondary'}
                          </span>
                          <code className="opacity-90">{line}</code>
                        </div>
                      );
                    })}
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

const PartnerManager: React.FC<{ 
  partners: Partner[], 
  onAdd: (name: string, primaryLines: string, secondaryLines: string) => void, 
  onDelete: (id: string) => void,
  onUpdate: (id: string, name: string, primaryLines: string, secondaryLines: string) => void
}> = ({ partners, onAdd, onDelete, onUpdate }) => {
  const [name, setName] = useState('');
  const [primaryLines, setPrimaryLines] = useState('');
  const [secondaryLines, setSecondaryLines] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdate(editingId, name, primaryLines, secondaryLines);
      setEditingId(null);
    } else {
      onAdd(name, primaryLines, secondaryLines);
    }
    setName('');
    setPrimaryLines('');
    setSecondaryLines('');
  };

  const startEdit = (partner: Partner) => {
    setEditingId(partner.id);
    setName(partner.name);
    const p = getPartnerPrimaryLines(partner);
    const s = getPartnerSecondaryLines(partner);
    setPrimaryLines(p.join('\n'));
    setSecondaryLines(s.join('\n'));
    const formElement = document.getElementById('partner-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setPrimaryLines('');
    setSecondaryLines('');
  };

  return (
    <div className="grid lg:grid-cols-3 gap-10">
      <div className="lg:col-span-1 space-y-6">
        <div id="partner-form" className="bg-white border border-line/20 p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-sm font-bold uppercase tracking-widest">
              {editingId ? 'Edit Partner' : 'Add New Partner'}
            </h2>
            <Settings size={16} className="opacity-30" />
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <label className="col-header block">Primary Line(s)</label>
              <p className="text-[10px] opacity-50 italic -mt-1">Enter core/primary ads.txt lines (one per line). Supports multiple lines.</p>
              <textarea 
                value={primaryLines}
                onChange={(e) => setPrimaryLines(e.target.value)}
                placeholder="domain.com, ID, DIRECT, TAG"
                className="w-full h-32 bg-bg/50 border border-line/10 p-3 font-mono text-xs focus:outline-none focus:border-line transition-colors resize-none"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="col-header block">Secondary / Reseller Line(s) (Optional)</label>
              <p className="text-[10px] opacity-50 italic -mt-1">Enter reseller or secondary ads.txt lines (one per line).</p>
              <textarea 
                value={secondaryLines}
                onChange={(e) => setSecondaryLines(e.target.value)}
                placeholder="domain.com, ID, RESELLER, TAG"
                className="w-full h-32 bg-bg/50 border border-line/10 p-3 font-mono text-xs focus:outline-none focus:border-line transition-colors resize-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                {editingId ? <Check size={16} /> : <Plus size={16} />}
                {editingId ? 'Update Partner' : 'Save Partner'}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={cancelEdit}
                  className="w-full py-3 font-mono text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-ink text-bg p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Info size={16} />
            <h3 className="font-mono text-[10px] uppercase tracking-widest font-bold">Guidelines</h3>
          </div>
          <ul className="space-y-3 text-xs opacity-80 font-light leading-relaxed">
            <li>• Configure <strong>Primary Lines</strong> and <strong>Secondary Lines</strong> separately for each partner.</li>
            <li>• A partner can have <strong>multiple Primary Lines</strong> if required.</li>
            <li>• Full verification requires <strong>all Primary Lines</strong> and Secondary Lines to be present.</li>
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
          {partners.map(partner => {
            const pList = getPartnerPrimaryLines(partner);
            const sList = getPartnerSecondaryLines(partner);
            const total = pList.length + sList.length;

            return (
              <div key={partner.id} className={`bg-white border p-5 group transition-all shadow-sm ${editingId === partner.id ? 'border-ink ring-1 ring-ink' : 'border-line/10 hover:border-line/30'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg tracking-tight underline-offset-4 decoration-line/20">{partner.name}</h3>
                    <p className="col-header">{pList.length} primary line(s), {sList.length} secondary line(s) configured ({total} total)</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => startEdit(partner)}
                      className="p-2 hover:bg-ink/5 transition-all rounded-sm text-ink/40 hover:text-ink"
                      title="Edit Partner"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => onDelete(partner.id)}
                      className="text-accent-rose p-2 hover:bg-accent-rose/10 transition-all rounded-sm opacity-40 hover:opacity-100"
                      title="Delete Partner"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-[9px] font-mono uppercase bg-ink text-bg px-1.5 py-0.5 rounded-none shrink-0 mt-0.5">Primary ({pList.length})</span>
                    <div className="space-y-1 flex-1 overflow-hidden">
                      {pList.map((l, idx) => (
                        <code key={idx} className="text-[10px] font-mono opacity-80 block truncate">{l}</code>
                      ))}
                    </div>
                  </div>

                  {sList.length > 0 && (
                    <div className="flex items-start gap-2 pt-1 border-t border-line/5">
                      <span className="text-[9px] font-mono uppercase bg-line/10 text-ink/60 px-1.5 py-0.5 rounded-none shrink-0 mt-0.5">Secondary ({sList.length})</span>
                      <div className="space-y-1 flex-1 overflow-hidden">
                        {sList.slice(0, 3).map((l, idx) => (
                          <code key={idx} className="text-[10px] font-mono opacity-50 block truncate">{l}</code>
                        ))}
                        {sList.length > 3 && (
                          <p className="text-[10px] font-mono opacity-40 italic">+{sList.length - 3} more secondary lines</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {partners.length === 0 && (
            <div className="text-center py-20 border border-dashed border-line/20 opacity-30 bg-white/50">
              <p className="font-mono text-sm uppercase tracking-widest">No partners saved</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

