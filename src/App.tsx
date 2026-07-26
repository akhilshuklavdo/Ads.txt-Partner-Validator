import React, { useState, useEffect, useMemo, useRef, ReactNode, FormEvent } from 'react';
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
  Pencil,
  History,
  Clock,
  Cloud,
  RefreshCw,
  Lock,
  KeyRound,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { 
  Partner, 
  AnalysisResult, 
  AnalysisStatus,
  HistoryItem,
  getPartnerPrimaryLines,
  getPartnerSecondaryLines,
  getAllPartnerLines
} from './types';
import DEFAULT_PARTNERS from './partners.json';
import { 
  subscribeToPartners, 
  addPartnerInFirestore, 
  updatePartnerInFirestore, 
  deletePartnerFromFirestore,
  resetPartnersToDefault 
} from './lib/firebase';

const HISTORY_STORAGE_KEY = 'ads_txt_history';

const VdoAiLogo = ({ className = "h-8 w-auto" }: { className?: string }) => (
  <svg viewBox="0 0 320 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M 6 14 C 6 7.5 13.2 3.5 19 6.8 L 48 24 C 54 27.5 54 34.5 48 38 L 19 55.2 C 13.2 58.5 6 54.5 6 48 Z" fill="#E50914" />
    <text x="66" y="52" fill="#0F172A" fontFamily="Arial Black, Impact, 'Arial Black', sans-serif" fontWeight="900" fontSize="52" letterSpacing="-1px">VDO</text>
    <circle cx="202" cy="46" r="7.5" fill="#E50914" />
    <text x="218" y="52" fill="#0F172A" fontFamily="Arial Black, Impact, 'Arial Black', sans-serif" fontWeight="900" fontSize="52" letterSpacing="-1px">AI</text>
  </svg>
);

const CodeVerificationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  actionName?: string;
}> = ({ isOpen, onClose, onConfirm, title = "3-Digit Security Verification", actionName = "make changes to partners" }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    const expectedPin = (import.meta.env.VITE_MANAGE_PARTNER_PIN || import.meta.env.VITE_SECURITY_PIN || '123').toString().trim();

    if (trimmed !== expectedPin) {
      setError('Incorrect security PIN. Please try again.');
      return;
    }
    setError('');
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-slate-300 rounded-lg shadow-xl max-w-md w-full p-6 space-y-5"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-900 rounded-md">
              <KeyRound size={22} />
            </div>
            <div>
              <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-slate-900">{title}</h3>
              <p className="text-xs text-slate-600 mt-0.5">Enter 3-digit code to authorize {actionName}.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="col-header block text-center">Security PIN</label>
            <input 
              type="text"
              inputMode="numeric"
              maxLength={(import.meta.env.VITE_MANAGE_PARTNER_PIN || import.meta.env.VITE_SECURITY_PIN || '123').toString().trim().length}
              value={code}
              onChange={(e) => {
                const maxLen = (import.meta.env.VITE_MANAGE_PARTNER_PIN || import.meta.env.VITE_SECURITY_PIN || '123').toString().trim().length;
                const val = e.target.value.replace(/\D/g, '').slice(0, maxLen);
                setCode(val);
                if (error) setError('');
              }}
              placeholder="123"
              autoFocus
              className="w-full bg-slate-50 border border-slate-300 p-3 font-mono text-3xl font-extrabold text-center tracking-[0.5em] text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-md shadow-xs"
            />
            {error ? (
              <p className="text-xs font-semibold text-rose-600 text-center">{error}</p>
            ) : (
              <p className="text-[11px] text-slate-500 text-center italic">
                {import.meta.env.VITE_MANAGE_PARTNER_PIN || import.meta.env.VITE_SECURITY_PIN ? 'Enter PIN configured in environment variables' : 'Default PIN: 123 (Change via VITE_MANAGE_PARTNER_PIN)'}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-sans text-xs font-bold uppercase tracking-wider rounded hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={code.length === 0}
              className="flex-1 py-2.5 bg-slate-900 text-white font-sans text-xs font-bold uppercase tracking-wider rounded hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Verify Code
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [activeTab, setActiveTab] = useState<'check' | 'manage'>('check');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [adsTxtContent, setAdsTxtContent] = useState('');
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hoveredHistoryItem, setHoveredHistoryItem] = useState<{ item: HistoryItem; index: number; top: number } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const historyScrollRef = useRef<HTMLDivElement>(null);

  // Helper to filter out history older than 24 hours and limit to max 10
  const filterValidHistory = (items: HistoryItem[]): HistoryItem[] => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    return items
      .filter(item => item && typeof item.timestamp === 'number' && item.timestamp >= twentyFourHoursAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  };

  // Sorted list of partners for management
  const sortedPartners = useMemo(() => {
    return [...partners].sort((a, b) => a.name.localeCompare(b.name));
  }, [partners]);

  // Real-time Firestore synchronization for partners
  useEffect(() => {
    const unsubscribe = subscribeToPartners((updatedPartners) => {
      setPartners(updatedPartners);
    });

    // Load local history
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (savedHistory) {
      try {
        const parsed: HistoryItem[] = JSON.parse(savedHistory);
        const valid = filterValidHistory(parsed);
        setHistory(valid);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(valid));
      } catch (e) {
        setHistory([]);
      }
    }

    return () => unsubscribe();
  }, []);

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  };

  const handleRestoreHistoryItem = (item: HistoryItem) => {
    setWebsiteUrl(item.websiteUrl || '');
    setAdsTxtContent(item.adsTxtContent || '');
    setResults(item.results || []);
  };

  const formatHistoryTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDomainOrName = (url: string) => {
    if (!url || !url.trim()) return 'Direct Input';
    try {
      let cleaned = url.trim();
      if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
        cleaned = 'https://' + cleaned;
      }
      const parsed = new URL(cleaned);
      let hostname = parsed.hostname || url;
      if (hostname.toLowerCase().startsWith('www.')) {
        hostname = hostname.slice(4);
      }
      return hostname || url;
    } catch {
      let fallback = url.trim();
      fallback = fallback.replace(/^https?:\/\//i, '');
      fallback = fallback.replace(/^www\./i, '');
      fallback = fallback.split('/')[0].split('?')[0].split('#')[0];
      return fallback || url;
    }
  };

  const handleAddPartner = async (name: string, primaryLinesStr: string, allLinesStr: string) => {
    const primaryLines = primaryLinesStr.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const rawAllLines = allLinesStr.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    if (!name || (primaryLines.length === 0 && rawAllLines.length === 0)) return;

    // Combine and deduplicate primaryLines and allLines
    const allLinesMap = new Map<string, string>();
    [...primaryLines, ...rawAllLines].forEach(line => {
      const key = line.trim().toLowerCase();
      if (key && !allLinesMap.has(key)) {
        allLinesMap.set(key, line.trim());
      }
    });
    const mergedAllLines = Array.from(allLinesMap.values());

    // Secondary lines are all lines minus primary lines
    const primarySet = new Set(primaryLines.map(l => l.toLowerCase()));
    const secondaryLines = mergedAllLines.filter(l => !primarySet.has(l.toLowerCase()));

    try {
      setIsSyncing(true);
      await addPartnerInFirestore({
        name,
        primaryLines,
        secondaryLines,
        lines: mergedAllLines
      });
    } catch (err) {
      console.error('Failed to add partner to Firestore:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeletePartner = async (id: string) => {
    try {
      setIsSyncing(true);
      await deletePartnerFromFirestore(id);
    } catch (err) {
      console.error('Failed to delete partner from Firestore:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdatePartner = async (id: string, name: string, primaryLinesStr: string, allLinesStr: string) => {
    const primaryLines = primaryLinesStr.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const rawAllLines = allLinesStr.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    if (!name || (primaryLines.length === 0 && rawAllLines.length === 0)) return;

    // Combine and deduplicate
    const allLinesMap = new Map<string, string>();
    [...primaryLines, ...rawAllLines].forEach(line => {
      const key = line.trim().toLowerCase();
      if (key && !allLinesMap.has(key)) {
        allLinesMap.set(key, line.trim());
      }
    });
    const mergedAllLines = Array.from(allLinesMap.values());

    const primarySet = new Set(primaryLines.map(l => l.toLowerCase()));
    const secondaryLines = mergedAllLines.filter(l => !primarySet.has(l.toLowerCase()));

    try {
      setIsSyncing(true);
      await updatePartnerInFirestore(id, {
        name,
        primaryLines,
        secondaryLines,
        lines: mergedAllLines
      });
    } catch (err) {
      console.error('Failed to update partner in Firestore:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetPartners = async () => {
    if (window.confirm('Reset all demand partners data in Firestore back to original defaults?')) {
      try {
        setIsSyncing(true);
        await resetPartnersToDefault();
      } catch (err) {
        console.error('Failed to reset partners in Firestore:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const analyzeAdsTxt = () => {
    const rawInputLines = adsTxtContent
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    // Parse ads.txt line into standard fields: <domain>, <accountId>, <relationshipType>, <certId>
    const parseAdsTxtLine = (line: string) => {
      const withoutComment = line.split('#')[0].trim();
      if (!withoutComment) return null;
      const parts = withoutComment.split(',').map(s => s.trim());
      if (parts.length < 2 || !parts[0] || !parts[1]) return null;

      return {
        raw: line,
        domain: parts[0].toLowerCase(),
        accountId: parts[1].toLowerCase(),
        relationshipType: parts[2] ? parts[2].toLowerCase() : '',
        certId: parts[3] ? parts[3].toLowerCase() : ''
      };
    };

    const parsedInputLines = rawInputLines
      .map(line => parseAdsTxtLine(line))
      .filter((parsed): parsed is NonNullable<ReturnType<typeof parseAdsTxtLine>> => parsed !== null);

    const analysis: AnalysisResult[] = partners.map(partner => {
      const primaryLines = getPartnerPrimaryLines(partner);
      const secondaryLines = getPartnerSecondaryLines(partner);

      const findMatchingInputLine = (pLine: string): string | null => {
        const parsedP = parseAdsTxtLine(pLine);
        
        if (parsedP) {
          // Primary check: Advertising System Domain and Publisher Account ID
          // Prefer matching relationship type if present in both
          const exactMatch = parsedInputLines.find(i => 
            i.domain === parsedP.domain && 
            i.accountId === parsedP.accountId &&
            (!parsedP.relationshipType || !i.relationshipType || parsedP.relationshipType === i.relationshipType)
          );
          if (exactMatch) return exactMatch.raw;

          const domainAccountMatch = parsedInputLines.find(i => 
            i.domain === parsedP.domain && 
            i.accountId === parsedP.accountId
          );
          if (domainAccountMatch) return domainAccountMatch.raw;

          return null;
        }

        // Fallback exact line match for non-standard or custom lines
        const normP = pLine.split('#')[0].trim().toLowerCase();
        const fallbackMatch = rawInputLines.find(iLine => {
          const normI = iLine.split('#')[0].trim().toLowerCase();
          return normI === normP;
        });

        return fallbackMatch || null;
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
        .map(m => m.configured);

      const missingPrimary = primaryMatches
        .filter(m => m.matched === null)
        .map(m => m.configured);

      const foundSecondary = secondaryMatches
        .filter(m => m.matched !== null)
        .map(m => m.configured);

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
        missingLines,
        missingPrimaryLines: missingPrimary,
        missingSecondaryLines: missingSecondary
      };
    });

    setResults(analysis);

    // Save completed analysis to history
    const newHistoryEntry: HistoryItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      websiteUrl,
      adsTxtContent,
      timestamp: Date.now(),
      results: analysis
    };

    setHistory(prev => {
      const updated = filterValidHistory([newHistoryEntry, ...prev]);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save analysis history:', err);
      }
      return updated;
    });
  };


  const downloadMissingPrimaryLines = () => {
    const allMissingPrimaryLines = results.flatMap(r => {
      if (r.missingPrimaryLines) return r.missingPrimaryLines;
      const primaryLines = getPartnerPrimaryLines(r.partner);
      const parseKey = (s: string) => {
        const parts = s.split('#')[0].split(',').map(x => x.trim().toLowerCase());
        return parts.length >= 2 ? `${parts[0]},${parts[1]}` : s.trim().toLowerCase();
      };
      const primaryKeys = new Set(primaryLines.map(parseKey));
      return r.missingLines.filter(line => primaryKeys.has(parseKey(line)));
    });

    if (allMissingPrimaryLines.length === 0) return;

    const uniqueMap = new Map<string, string>();
    allMissingPrimaryLines.forEach(line => {
      const key = line.trim().toLowerCase();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, line.trim());
      }
    });
    const uniqueMissingPrimary = Array.from(uniqueMap.values());
    
    const blob = new Blob([uniqueMissingPrimary.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'missing_primary_ads_txt_lines.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllMissingLines = () => {
    const allMissingLines = results.flatMap(r => r.missingLines);
    if (allMissingLines.length === 0) return;

    // Use a Map to guarantee zero duplicates (case-insensitive & whitespace normalized)
    const uniqueMap = new Map<string, string>();
    allMissingLines.forEach(line => {
      const key = line.trim().toLowerCase();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, line.trim());
      }
    });
    const uniqueMissingLines = Array.from(uniqueMap.values());
    
    const blob = new Blob([uniqueMissingLines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'missing_ads_txt_lines.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalMissingPrimaryCount = useMemo(() => {
    const uniqueMap = new Map<string, string>();
    results.forEach(r => {
      const missingPrimaries = r.missingPrimaryLines || getPartnerPrimaryLines(r.partner).filter(pl => r.missingLines.includes(pl));
      missingPrimaries.forEach(line => {
        const key = line.trim().toLowerCase();
        if (key && !uniqueMap.has(key)) uniqueMap.set(key, line.trim());
      });
    });
    return uniqueMap.size;
  }, [results]);

  const totalMissingAllCount = useMemo(() => {
    const uniqueMap = new Map<string, string>();
    results.forEach(r => {
      r.missingLines.forEach(line => {
        const key = line.trim().toLowerCase();
        if (key && !uniqueMap.has(key)) uniqueMap.set(key, line.trim());
      });
    });
    return uniqueMap.size;
  }, [results]);

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
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 p-5 lg:px-10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-4">
          <VdoAiLogo className="h-9 w-auto shrink-0" />
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <h1 className="font-sans text-xl font-extrabold tracking-tight text-slate-900 uppercase">Ads.txt Validator</h1>
            <p className="col-header">Demand Partner Verification Engine</p>
          </div>
        </div>
        
        <nav className="flex gap-1.5 bg-slate-100 p-1.5 rounded-md border border-slate-200">
          <button 
            onClick={() => setActiveTab('check')}
            className={`px-5 py-2 font-sans text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${
              activeTab === 'check' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            Check ads.txt
          </button>
          <button 
            onClick={() => setActiveTab('manage')}
            className={`px-5 py-2 font-sans text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${
              activeTab === 'manage' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
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
              {/* Main Workspace Layout with Conditional Left History Rail */}
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Slim Left History Rail: ONLY appears if there is search history */}
                {history.length > 0 && (
                  <div className="w-full md:w-auto shrink-0 group/history relative">
                    {/* Clean Minimalist Vertical Rail Container */}
                    <div className="relative bg-white border border-slate-200 rounded-md p-2.5 min-w-[48px] md:w-12 flex flex-col items-center gap-2 shadow-xs transition-all">
                      
                      {/* Clear button - ONLY appears when user hovers inside the history box container */}
                      <button
                        onClick={handleClearHistory}
                        className="opacity-0 group-hover/history:opacity-100 transition-opacity text-[10px] font-sans font-bold text-slate-500 hover:text-rose-600 uppercase cursor-pointer py-0.5 tracking-wider"
                        title="Clear all history"
                      >
                        Clear
                      </button>

                      {/* Scrollable History Items Vertical Line List without scrollbar signs */}
                      <div 
                        ref={historyScrollRef}
                        onScroll={() => setHoveredHistoryItem(null)}
                        className="flex flex-col items-center gap-2.5 py-1 w-full max-h-[320px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                      >
                        {history.map((item, index) => (
                          <div
                            key={item.id}
                            onClick={() => handleRestoreHistoryItem(item)}
                            onMouseEnter={(e) => {
                              const target = e.currentTarget;
                              const parent = historyScrollRef.current;
                              const top = target.offsetTop - (parent ? parent.scrollTop : 0);
                              setHoveredHistoryItem({ item, index, top });
                            }}
                            onMouseLeave={() => setHoveredHistoryItem(null)}
                            className="group/item relative flex items-center justify-center py-1 cursor-pointer w-full"
                          >
                            {/* Single shaded line segment */}
                            <div className="w-6 h-1.5 rounded-full bg-slate-300 group-hover/item:bg-slate-900 group-hover/item:w-8 transition-all duration-150 shrink-0 shadow-xs" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Popover / Tooltip rendered on outer parent container (never clipped by overflow-y-auto) */}
                    <AnimatePresence>
                      {hoveredHistoryItem && (
                        <motion.div
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -5 }}
                          transition={{ duration: 0.12 }}
                          style={{ top: `${hoveredHistoryItem.top + 28}px` }}
                          className="absolute left-full ml-3 flex items-center gap-3 bg-slate-900 text-white text-xs font-mono px-4 py-3 rounded-md shadow-2xl z-50 whitespace-nowrap min-w-[200px] border border-slate-700 pointer-events-auto"
                          onMouseEnter={() => setHoveredHistoryItem(hoveredHistoryItem)}
                          onMouseLeave={() => setHoveredHistoryItem(null)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white text-sm truncate max-w-[180px]">
                              {formatDomainOrName(hoveredHistoryItem.item.websiteUrl)}
                            </div>
                            <div className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                              <span>Check #{history.length - hoveredHistoryItem.index}</span>
                              <span>•</span>
                              <span>{formatHistoryTime(hoveredHistoryItem.item.timestamp)}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHistoryItem(hoveredHistoryItem.item.id);
                              setHoveredHistoryItem(null);
                            }}
                            className="text-slate-400 hover:text-rose-400 p-1 transition-colors cursor-pointer shrink-0 ml-1"
                            title="Delete item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Rest of Section: Website URL & Ads.txt Content Input in same column & Analysis Results */}
                <section className="grid lg:grid-cols-3 gap-8 flex-1 w-full">
                  <div className="lg:col-span-1 space-y-6">
                    {/* Website URL Input */}
                    <div className="space-y-2">
                      <label className="col-header block">Website URL (Optional)</label>
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                          type="text" 
                          placeholder="example.com"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className="w-full bg-white border border-slate-300 p-3 pl-10 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors rounded-sm shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Ads.txt Content Textarea */}
                    <div className="space-y-2">
                      <label className="col-header block">Ads.txt Content</label>
                      <textarea 
                        placeholder="Paste ads.txt content here..."
                        value={adsTxtContent}
                        onChange={(e) => setAdsTxtContent(e.target.value)}
                        className="w-full h-64 bg-white border border-slate-300 p-4 font-mono text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors resize-none rounded-sm shadow-xs"
                      />
                    </div>

                    <button 
                      onClick={analyzeAdsTxt}
                      disabled={!adsTxtContent}
                      className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 rounded-sm disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider"
                    >
                      Run Analysis
                    </button>
                  </div>

                <div className="lg:col-span-2 space-y-8">
                  {results.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-md p-12 text-center space-y-4 bg-white/60 shadow-2xs">
                      <div className="bg-slate-100 p-4 rounded-full text-slate-600">
                        <Info size={44} strokeWidth={1.5} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-serif font-semibold text-base text-slate-800 uppercase tracking-wide">No Analysis Performed</p>
                        <p className="text-xs text-slate-600">Paste ads.txt content and click "Run Analysis" to see results.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SummaryCard 
                          label="All Present" 
                          count={categorizedResults.all.length} 
                          variant="all" 
                          partners={categorizedResults.all} 
                        />
                        <SummaryCard 
                          label="Primary Present" 
                          count={categorizedResults.partial.length} 
                          variant="partial" 
                          partners={categorizedResults.partial} 
                        />
                        <SummaryCard 
                          label="Any Segment" 
                          count={categorizedResults.any.length} 
                          variant="any" 
                          partners={categorizedResults.any} 
                          alignRight={true}
                        />
                        <SummaryCard 
                          label="Not Present" 
                          count={categorizedResults.none.length} 
                          variant="none" 
                          partners={categorizedResults.none} 
                          alignRight={true}
                        />
                      </div>

                      {/* Detailed Results Table */}
                      <div className="space-y-6">
                        <ResultSection 
                          title="All Lines Present" 
                          results={categorizedResults.all} 
                          color="text-emerald-700"
                          borderColor="border-emerald-300 border-l-4 border-l-emerald-600"
                          headerBg="bg-emerald-50/80 border-b border-emerald-200"
                          icon={<CheckCircle2 size={18} className="text-emerald-600" />}
                          onRowClick={setSelectedResult}
                        />
                        <ResultSection 
                          title="Only Primary Line Present" 
                          results={categorizedResults.partial} 
                          color="text-amber-700"
                          borderColor="border-amber-300 border-l-4 border-l-amber-600"
                          headerBg="bg-amber-50/80 border-b border-amber-200"
                          icon={<AlertCircle size={18} className="text-amber-600" />}
                          onRowClick={setSelectedResult}
                        />
                         <ResultSection 
                          title="Any Line Present" 
                          results={categorizedResults.any} 
                          color="text-blue-700"
                          borderColor="border-blue-300 border-l-4 border-l-blue-600"
                          headerBg="bg-blue-50/80 border-b border-blue-200"
                          icon={<CircleDot size={18} className="text-blue-600" />}
                          onRowClick={setSelectedResult}
                        />
                        <ResultSection 
                          title="Not Present" 
                          results={categorizedResults.none} 
                          color="text-rose-700"
                          borderColor="border-rose-300 border-l-4 border-l-rose-600"
                          headerBg="bg-rose-50/80 border-b border-rose-200"
                          icon={<XCircle size={18} className="text-rose-600" />}
                          onRowClick={setSelectedResult}
                        />
                      </div>

                      {/* Download Missing Lines Buttons */}
                      {results.some(r => r.missingLines.length > 0) && (
                        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-slate-200 mt-6">
                          {totalMissingPrimaryCount > 0 && (
                            <button 
                              onClick={downloadMissingPrimaryLines}
                              className="flex items-center gap-2.5 px-6 py-3.5 bg-amber-600 text-white font-sans text-xs font-bold uppercase tracking-wider rounded-md hover:bg-amber-700 transition-all shadow-md active:scale-95"
                            >
                              <Download size={16} />
                              Download Missing Primary Lines
                              <span className="ml-2 bg-white/20 text-white px-2 py-0.5 rounded text-[11px] font-mono">
                                {totalMissingPrimaryCount}
                              </span>
                            </button>
                          )}

                          {totalMissingAllCount > 0 && (
                            <button 
                              onClick={downloadAllMissingLines}
                              className="flex items-center gap-2.5 px-6 py-3.5 bg-slate-900 text-white font-sans text-xs font-bold uppercase tracking-wider rounded-md hover:bg-slate-800 transition-all shadow-md active:scale-95"
                            >
                              <Download size={16} />
                              Download All Missing Lines
                              <span className="ml-2 bg-white/20 text-white px-2 py-0.5 rounded text-[11px] font-mono">
                                {totalMissingAllCount}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>

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
                onReset={handleResetPartners}
                isSyncing={isSyncing}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-slate-200 p-6 bg-white mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="col-header">Ads.txt Validator v2.3</p>
          <p className="font-sans text-xs font-bold text-slate-800 tracking-wide">
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
  variant: 'all' | 'partial' | 'any' | 'none',
  partners: AnalysisResult[],
  alignRight?: boolean
}> = ({ label, count, variant, partners, alignRight }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const names = partners.map(p => p.partner.name).join('\n');
    navigator.clipboard.writeText(names);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const styleMap = {
    all: {
      cardBg: 'bg-emerald-50/90 border-emerald-300 hover:border-emerald-500 border-l-emerald-600',
      labelColor: 'text-emerald-800',
      countColor: 'text-emerald-950',
      badgeText: 'Fully verified',
      icon: <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
    },
    partial: {
      cardBg: 'bg-amber-50/90 border-amber-300 hover:border-amber-500 border-l-amber-600',
      labelColor: 'text-amber-800',
      countColor: 'text-amber-950',
      badgeText: 'Primary line present',
      icon: <AlertCircle size={20} className="text-amber-600 shrink-0" />
    },
    any: {
      cardBg: 'bg-blue-50/90 border-blue-300 hover:border-blue-500 border-l-blue-600',
      labelColor: 'text-blue-800',
      countColor: 'text-blue-950',
      badgeText: 'Secondary line present',
      icon: <CircleDot size={20} className="text-blue-600 shrink-0" />
    },
    none: {
      cardBg: 'bg-rose-50/90 border-rose-300 hover:border-rose-500 border-l-rose-600',
      labelColor: 'text-rose-800',
      countColor: 'text-rose-950',
      badgeText: 'Lines missing',
      icon: <XCircle size={20} className="text-rose-600 shrink-0" />
    }
  }[variant];

  return (
    <div className={`relative group ${styleMap.cardBg} border-t border-r border-b border-l-4 p-4 space-y-1.5 shadow-xs cursor-help hover:shadow-md transition-all rounded-r-md`}>
      <div className="flex items-center justify-between gap-1">
        <p className={`font-sans text-xs font-bold uppercase tracking-wider ${styleMap.labelColor}`}>
          {label}
        </p>
        {styleMap.icon}
      </div>
      <p className={`text-3xl font-sans font-black ${styleMap.countColor}`}>{count}</p>
      <p className={`text-[11px] font-sans font-semibold ${styleMap.labelColor} opacity-80`}>
        {styleMap.badgeText}
      </p>
      
      {/* Popover */}
      <div className={`absolute top-full ${alignRight ? 'right-0' : 'left-0'} mt-2 w-72 bg-slate-900 text-white border border-slate-700 shadow-2xl p-4 z-30 hidden group-hover:block pointer-events-auto text-left rounded-md transition-all duration-150`}>
        <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-700">
          <p className="font-sans text-xs uppercase tracking-wider text-slate-200 font-bold">
            {label} ({count})
          </p>
          {partners.length > 0 && (
            <button 
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 text-[10px] font-sans font-semibold uppercase text-white transition-colors rounded cursor-pointer"
              title="Copy all names to clipboard"
            >
              {copied ? 'Copied!' : 'Copy List'}
            </button>
          )}
        </div>
        {partners.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No partners in this category</p>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 [scrollbar-width:thin]">
            {partners.map(r => (
              <div 
                key={r.partner.id} 
                className="text-xs py-1 font-sans text-slate-100 hover:bg-white/10 px-2 rounded select-all break-words font-medium"
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
  headerBg: string,
  icon: ReactNode,
  onRowClick: (res: AnalysisResult) => void 
}> = ({ title, results, color, borderColor, headerBg, icon, onRowClick }) => {
  if (results.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 ${color}`}>
        {icon}
        <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-900">{title}</h3>
        <span className="h-px flex-1 bg-slate-300"></span>
        <span className="font-mono text-xs font-semibold text-slate-700">({results.length})</span>
      </div>
      
      <div className={`bg-white border ${borderColor} overflow-hidden shadow-xs rounded-md`}>
        <div className={`data-row grid-cols-[1.5fr_2fr_1fr] ${headerBg} py-2.5 px-4`}>
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

  return (
    <div className={`${!isLast ? 'border-b border-slate-200' : ''}`}>
      <div 
        onClick={onClick}
        className="data-row grid-cols-[1.5fr_2fr_1fr] py-3.5 px-4 group cursor-pointer hover:bg-slate-100/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors flex items-center gap-1.5 font-sans">
            {result.partner.name}
            <ExternalLink size={12} className="opacity-0 group-hover:opacity-70 transition-opacity text-blue-700" />
          </span>
        </div>
        <span className="data-value truncate text-slate-800 font-mono text-xs font-medium" title={primaryLines.join('\n')}>
          {primaryDisplay}
        </span>
        <div className="flex justify-end items-center gap-2">
          {result.status === 'partial' && (
            <span className="text-xs font-sans font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-sm">
              {result.missingLines.length} Missing
            </span>
          )}
          {result.status === 'any_secondary' && (
             <span className="text-xs font-sans font-bold bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-sm">
              Primary Missing
           </span>
          )}
          <span className={`text-xs font-sans font-extrabold uppercase tracking-wide ${color}`}>
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
    const parseKey = (s: string) => {
      const parts = s.split('#')[0].split(',').map(x => x.trim().toLowerCase());
      return parts.length >= 2 ? `${parts[0]},${parts[1]}` : s.trim().toLowerCase();
    };
    const targetKey = parseKey(line);
    return primaryLines.some(pl => parseKey(pl) === targetKey);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-300 rounded-md overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="font-sans font-extrabold text-xl tracking-tight uppercase text-slate-900 flex items-center gap-3">
              {result.partner.name}
              <span className={`text-xs font-sans font-bold px-3 py-1 rounded-full border uppercase ${
                result.status === 'all' ? 'border-emerald-500 text-emerald-800 bg-emerald-50' :
                result.status === 'partial' ? 'border-amber-500 text-amber-800 bg-amber-50' :
                result.status === 'any_secondary' ? 'border-blue-500 text-blue-800 bg-blue-50' :
                'border-rose-500 text-rose-800 bg-rose-50'
              }`}>
                {result.status.replace('_', ' ')}
              </span>
            </h2>
            <p className="col-header mt-1">Detailed ads.txt line analysis • {primaryLines.length} Primary line(s), {secondaryLines.length} Secondary line(s)</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
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
                <div className="flex items-center gap-2 text-emerald-700 font-sans text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 size={18} />
                  Present Lines ({result.foundLines.length})
                </div>
                <button 
                  onClick={() => copyLines(result.foundLines, setCopiedFound)}
                  disabled={result.foundLines.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-300 text-slate-800 rounded font-sans text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-40"
                >
                  {copiedFound ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                  {copiedFound ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-200 p-4 overflow-auto rounded group relative">
                {result.foundLines.length > 0 ? (
                  <div className="space-y-2">
                    {result.foundLines.map((line, i) => {
                      const primary = isPrimary(line);
                      return (
                        <div key={i} className="flex items-start gap-2.5 font-mono text-xs leading-relaxed break-all p-2 bg-white border border-slate-200 rounded text-slate-900 font-medium">
                          <span className={`text-[10px] font-sans font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${primary ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-800'}`}>
                            {primary ? 'Primary' : 'Secondary'}
                          </span>
                          <code className="text-slate-900 font-medium">{line}</code>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-2">
                    <AlertCircle size={28} strokeWidth={1.5} />
                    <p className="font-serif italic text-xs uppercase tracking-wide">No matching lines detected</p>
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Missing Lines */}
            <div className="flex flex-col gap-3 min-h-[300px]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-rose-700 font-sans text-xs font-bold uppercase tracking-wider">
                  <XCircle size={18} />
                  Absent Lines ({result.missingLines.length})
                </div>
                <button 
                  onClick={() => copyLines(result.missingLines, setCopiedMissing)}
                  disabled={result.missingLines.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-300 text-slate-800 rounded font-sans text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-40"
                >
                  {copiedMissing ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                  {copiedMissing ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="flex-1 bg-rose-50/60 border border-rose-200 p-4 overflow-auto rounded">
                {result.missingLines.length > 0 ? (
                  <div className="space-y-2">
                    {result.missingLines.map((line, i) => {
                      const primary = isPrimary(line);
                      return (
                        <div key={i} className="flex items-start gap-2.5 font-mono text-xs leading-relaxed break-all p-2 bg-white border border-rose-200 rounded text-rose-950 font-medium">
                          <span className={`text-[10px] font-sans font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${primary ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-900 border border-rose-300'}`}>
                            {primary ? 'Primary' : 'Secondary'}
                          </span>
                          <code className="text-rose-900 font-semibold">{line}</code>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-emerald-700 text-center space-y-2">
                    <CheckCircle2 size={28} strokeWidth={1.5} />
                    <p className="font-serif italic text-xs uppercase tracking-wide">All configured lines verified</p>
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
  onAdd: (name: string, primaryLines: string, allLines: string) => void, 
  onDelete: (id: string) => void,
  onUpdate: (id: string, name: string, primaryLines: string, allLines: string) => void,
  onReset: () => void,
  isSyncing: boolean
}> = ({ partners, onAdd, onDelete, onUpdate, onReset, isSyncing }) => {
  const [name, setName] = useState('');
  const [primaryLines, setPrimaryLines] = useState('');
  const [allLines, setAllLines] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 3-Digit Security Code State
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ fn: () => void; name: string } | null>(null);

  const requireCodeAndExecute = (actionFn: () => void, actionName: string) => {
    if (isAuthorized) {
      actionFn();
    } else {
      setPendingAction({ fn: actionFn, name: actionName });
      setCodeModalOpen(true);
    }
  };

  const handleCodeConfirmed = () => {
    setIsAuthorized(true);
    setCodeModalOpen(false);
    if (pendingAction) {
      pendingAction.fn();
      setPendingAction(null);
    }
  };

  const filteredPartners = useMemo(() => {
    if (!searchQuery.trim()) return partners;
    const q = searchQuery.toLowerCase();
    return partners.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.lines?.some(l => l.toLowerCase().includes(q))
    );
  }, [partners, searchQuery]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const actionName = editingId ? `updating partner "${name}"` : `adding partner "${name}"`;
    requireCodeAndExecute(() => {
      if (editingId) {
        onUpdate(editingId, name, primaryLines, allLines);
        setEditingId(null);
      } else {
        onAdd(name, primaryLines, allLines);
      }
      setName('');
      setPrimaryLines('');
      setAllLines('');
    }, actionName);
  };

  const startEdit = (partner: Partner) => {
    requireCodeAndExecute(() => {
      setSelectedPartnerId(partner.id);
      setEditingId(partner.id);
      setName(partner.name);
      const p = getPartnerPrimaryLines(partner);
      const a = getAllPartnerLines(partner);
      setPrimaryLines(p.join('\n'));
      setAllLines(a.join('\n'));
      const formElement = document.getElementById('partner-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, `editing partner "${partner.name}"`);
  };

  const handleDelete = (partner: Partner) => {
    requireCodeAndExecute(() => {
      onDelete(partner.id);
    }, `deleting partner "${partner.name}"`);
  };

  const handleReset = () => {
    requireCodeAndExecute(() => {
      onReset();
    }, 'restoring default partners list');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setPrimaryLines('');
    setAllLines('');
  };

  return (
    <>
      <CodeVerificationModal 
        isOpen={codeModalOpen}
        onClose={() => setCodeModalOpen(false)}
        onConfirm={handleCodeConfirmed}
        actionName={pendingAction?.name}
      />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (30-40% width coverage ~ 33.3%): Add / Edit Partner Form & Instructions */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4 z-10 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">
          {/* Instructions Box */}
          <div className="bg-slate-900 text-white p-4 space-y-2.5 shadow-sm rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-slate-300 shrink-0" />
                <h3 className="font-sans text-xs uppercase tracking-wider font-bold text-white">Instructions</h3>
              </div>
              {isAuthorized ? (
                <span className="flex items-center gap-1 text-[10px] font-sans font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 border border-emerald-700/50 rounded">
                  <ShieldCheck size={11} /> Authorized
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-sans font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 border border-amber-700/50 rounded">
                  <KeyRound size={11} /> 3-Digit Code Protected
                </span>
              )}
            </div>
            <ul className="space-y-1.5 text-xs text-slate-200 font-normal leading-relaxed">
              <li>• A 3-digit security PIN is required before saving, editing, or deleting partners.</li>
              <li>• Editing or deleting partners will sync immediately to Cloud Storage.</li>
              <li>• Missing line downloads automatically exclude duplicates across all configured partners.</li>
            </ul>
          </div>

          {/* Add / Edit Form Card Box */}
          <div id="partner-form" className="bg-white border border-slate-300 p-5 space-y-4 shadow-sm rounded-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-slate-900">
                  {editingId ? `Edit: ${name || 'Selected'}` : 'Add New Demand Partner'}
                </h2>
              </div>
              {editingId && (
                <button 
                  type="button" 
                  onClick={cancelEdit}
                  className="text-xs font-sans font-semibold text-slate-600 hover:text-slate-900 underline"
                >
                  + Add New
                </button>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="col-header block">Partner Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Google AdManager, Criteo, Magnite"
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 text-slate-900 font-mono text-xs placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors rounded-sm"
                  required
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="col-header block">Primary Line for Partner</label>
                <p className="text-xs text-slate-600 italic -mt-1 font-sans">One Entry Per Line</p>
                <textarea 
                  value={primaryLines}
                  onChange={(e) => setPrimaryLines(e.target.value)}
                  placeholder="domain.com, ID, DIRECT, TAG"
                  className="w-full h-20 bg-slate-50 border border-slate-300 p-2.5 text-slate-900 font-mono text-xs placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors resize-none rounded-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="col-header block">All Lines for Partner</label>
                <p className="text-xs text-slate-600 italic -mt-1 font-sans">Includes Primary & Secondary Lines.</p>
                <textarea 
                  value={allLines}
                  onChange={(e) => setAllLines(e.target.value)}
                  placeholder="domain.com, ID, DIRECT, TAG&#10;domain.com, ID, RESELLER, TAG"
                  className="w-full h-28 bg-slate-50 border border-slate-300 p-2.5 text-slate-900 font-mono text-xs placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors resize-none rounded-sm"
                  required
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={isSyncing} className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-xs rounded-sm">
                  {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : editingId ? <Check size={14} /> : <Plus size={14} />}
                  {editingId ? 'Update Partner' : 'Save Partner'}
                </button>
                {editingId && (
                  <button 
                    type="button" 
                    onClick={cancelEdit}
                    className="px-4 py-2.5 border border-slate-300 text-slate-800 font-sans text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors rounded-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (60-70% width coverage ~ 66.7%): Open, Spacious Demand Partners & Lines List */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Control Bar */}
          <div className="bg-white border border-slate-300 p-5 space-y-4 shadow-xs rounded-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
              <div>
                <h2 className="font-sans text-base font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <span>Demand Partners & Lines</span>
                  <span className="text-xs font-semibold text-slate-600">({filteredPartners.length} partners configured)</span>
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Overview of all Registered Demand Partners and their ads.txt lines.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-xs font-sans font-bold">
                  <Cloud size={13} />
                  <span>Cloud Synced</span>
                </div>
                <button 
                  onClick={handleReset}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 text-xs font-sans font-bold text-slate-700 hover:text-rose-700 transition-colors px-3 py-1.5 border border-slate-300 rounded-sm hover:border-rose-300 bg-slate-50"
                  title="Reset partners list to default dataset"
                >
                  <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
                  <span>Restore Defaults</span>
                </button>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search partner by name or domain..."
                className="w-full bg-slate-50 border border-slate-300 py-2.5 pl-10 pr-4 font-sans text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors rounded-sm"
              />
            </div>
          </div>

          {/* Open, Spacious Partner Detail Display */}
          <div className="space-y-5">
            {filteredPartners.map(partner => {
              const pList = getPartnerPrimaryLines(partner);
              const aList = getAllPartnerLines(partner);
              const isEditing = editingId === partner.id;

              return (
                <div 
                  key={partner.id} 
                  className={`bg-white border p-6 transition-all shadow-xs rounded-md space-y-4 ${
                    isEditing 
                      ? 'border-slate-900 ring-2 ring-slate-900/20 bg-slate-50/50' 
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {/* Partner Title Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <h3 className="font-extrabold text-xl tracking-tight text-slate-900 font-sans">{partner.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-sans font-extrabold px-2.5 py-0.5 bg-slate-900 text-white uppercase tracking-wider rounded">
                          {pList.length} Primary Line{pList.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs font-sans font-bold px-2.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 uppercase tracking-wider rounded">
                          {aList.length} Total Line{aList.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => startEdit(partner)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-900 hover:text-white transition-colors font-sans font-bold text-xs rounded text-slate-800"
                      >
                        <Pencil size={13} />
                        <span>Edit Partner</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(partner)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-600 hover:text-white transition-colors font-sans font-bold text-xs rounded"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                {/* Primary Lines Open View */}
                <div className="space-y-1.5">
                  <span className="col-header block text-xs">Primary Ads.txt Line(s)</span>
                  {pList.length > 0 ? (
                    <div className="bg-slate-50 border border-slate-200 p-3 font-mono text-xs space-y-2 rounded">
                      {pList.map((line, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-slate-900 font-medium">
                          <span className="text-slate-500 font-bold select-none w-6 pt-0.5 text-xs">#{idx + 1}</span>
                          <code className="break-all font-mono text-xs text-slate-900">{line}</code>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-500 font-sans">No primary lines configured.</p>
                  )}
                </div>

                {/* All Associated Lines Open View */}
                <div className="space-y-1.5">
                  <span className="col-header block text-xs">All Configured Lines ({aList.length})</span>
                  {aList.length > 0 ? (
                    <div className="bg-slate-50 border border-slate-200 p-3 font-mono text-xs space-y-2 max-h-64 overflow-y-auto [scrollbar-width:thin] rounded">
                      {aList.map((line, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-slate-900 border-b border-slate-200/60 pb-1.5 last:border-b-0 last:pb-0 font-medium">
                          <span className="text-slate-500 font-bold select-none w-6 pt-0.5 text-xs">#{idx + 1}</span>
                          <code className="break-all font-mono text-xs flex-1 text-slate-900">{line}</code>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-500 font-sans">No associated lines configured.</p>
                  )}
                </div>
              </div>
            );
          })}

          {filteredPartners.length === 0 && (
            <div className="text-center py-12 border border-dashed border-slate-300 bg-white shadow-xs p-8 rounded-md space-y-2">
              <p className="font-serif font-bold text-base uppercase tracking-wide text-slate-800">No Partners Match Your Search</p>
              <p className="text-xs text-slate-600">Try searching for a different partner name or reset your search query.</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

