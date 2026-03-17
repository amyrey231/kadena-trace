"use client";

import { useState, useCallback, useEffect } from "react";
import { 
  ReactFlow, Background, Controls, applyNodeChanges, applyEdgeChanges,
  Node, Edge, NodeChange, EdgeChange, Handle, Position, NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  ShieldAlert, Search, Activity, Network, AlertTriangle, 
  Wallet, ShieldCheck, Database, Sun, Moon, Fingerprint, 
  Lock, FileText, Crosshair, Loader2
} from "lucide-react";

// --- 1. ENTERPRISE CYBER NODE COMPONENT ---
const CyberNode = ({ data }: { data: any }) => {
  const isCritical = data.risk === 'critical';
  const isWarning = data.risk === 'warning';
  
  const glowColor = isCritical ? 'shadow-rose-500/50 border-rose-500/50 bg-rose-500/5' 
                  : isWarning ? 'shadow-amber-500/50 border-amber-500/50 bg-amber-500/5' 
                  : 'shadow-emerald-500/50 border-emerald-500/50 bg-emerald-500/5';

  const textColor = isCritical ? 'text-rose-500 dark:text-rose-400' 
                  : isWarning ? 'text-amber-600 dark:text-amber-400' 
                  : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div className={`relative px-5 py-4 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-xl backdrop-blur-xl shadow-lg transition-all hover:scale-105 hover:shadow-2xl hover:${glowColor} group min-w-[240px]`}>
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-slate-400 dark:!bg-slate-500 border-none" />
      
      <div className="flex justify-between items-center mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
         <span className={`text-[9px] font-black tracking-[0.2em] uppercase ${textColor} flex items-center gap-1.5`}>
           {isCritical ? <AlertTriangle className="w-3 h-3"/> : isWarning ? <Database className="w-3 h-3"/> : <ShieldCheck className="w-3 h-3"/>}
           {data.role}
         </span>
         <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
  {data.volume}
</span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border ${glowColor.replace('shadow-', 'border-').split(' ')[1]} opacity-80`}>
          <Wallet className={`w-4 h-4 ${textColor}`} />
        </div>
        <div>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-0.5">Entity Address</p>
          <p className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{data.address}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-slate-400 dark:!bg-slate-500 border-none" />
    </div>
  );
};

const nodeTypes: NodeTypes = { cyber: CyberNode };

export default function FraudTracer() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isTracing, setIsTracing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [isAnchored, setIsAnchored] = useState(false);

  // NEW: Grab wallet from URL if someone shares a link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const traceWallet = params.get('trace');
    if (traceWallet) {
      setSearchQuery(traceWallet);
      setTimeout(() => {
        document.getElementById('analyze-btn')?.click();
      }, 500);
    }
  }, []);

  const handleAnchor = () => {
    setIsAnchoring(true);
    setTimeout(() => {
      setIsAnchoring(false);
      setIsAnchored(true);
      setTimeout(() => setIsAnchored(false), 3000); 
    }, 2000);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') { root.classList.add('dark'); } 
    else { root.classList.remove('dark'); }
  }, [theme]);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, []);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => setSelectedNode(node.data), []);
  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  const handleAnalyze = async () => {
  if (!searchQuery.trim()) return;
  
  setIsTracing(true);
  setNodes([]); 
  setEdges([]);

  try {
    const response = await fetch(`/api/trace?wallet=${encodeURIComponent(searchQuery)}`);
    const data = await response.json();
    
    setNodes(data.nodes);
    setEdges(data.edges);

  } catch (error) {
    console.error("Tracing failed", error);
  } finally {
    setIsTracing(false);
  }
};

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 dark:bg-[#080B10] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-500 selection:bg-rose-500/30">
      
      {/* --- TOP NAVIGATION BAR --- */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/60 bg-white/80 dark:bg-[#080B10]/80 backdrop-blur-xl z-20 transition-colors duration-500">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-rose-500 to-rose-700 p-2.5 rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.3)]">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400">
              Kadena <span className="text-rose-600 dark:text-rose-500">Trace</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-bold tracking-[0.3em] uppercase">Enterprise Forensics</p>
          </div>
        </div>

        <div className="flex flex-1 max-w-2xl mx-12 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
          <input 
            type="text" 
            placeholder="Enter Kadena Wallet Address or TX Hash..." 
            className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 rounded-xl py-3 pl-12 pr-32 text-sm focus:outline-none focus:border-rose-500/50 font-mono text-slate-800 dark:text-slate-200 relative z-10 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-inner transition-colors duration-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          />
          <button 
            id="analyze-btn"
            onClick={handleAnalyze}
            disabled={isTracing || !searchQuery}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-500 disabled:opacity-50 text-white text-[10px] font-black tracking-widest px-4 py-2 rounded-lg transition-all z-10 flex items-center gap-2"
          >
            {isTracing ? <><Loader2 className="w-3 h-3 animate-spin"/> TRACING</> : 'ANALYZE'}
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-500 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-black uppercase tracking-widest transition-colors duration-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Node Synced
          </div>
          <button onClick={toggleTheme} className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all shadow-sm dark:shadow-none">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 relative flex">
        
        {/* Left Panel: High-Level Analytics */}
        {nodes.length > 0 && (
          <div className="absolute top-6 left-6 z-10 w-72 bg-white/95 dark:bg-[#080B10]/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-2xl flex flex-col gap-6 transition-colors duration-500 animate-in fade-in slide-in-from-left-8">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                <Activity className="w-3 h-3 text-rose-500" /> Case Overview
              </h2>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors duration-500">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Stolen Funds Tracked</p>
                <h3 className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
  {nodes.reduce((acc, node) => {
  const val = parseFloat((node.data as { volume?: string }).volume || "0");
  return acc + (isNaN(val) ? 0 : val);
}, 0).toFixed(4)} 
  {searchQuery.startsWith('k:') ? ' KDA' : ' ETH'}
</h3>
              </div>
            </div>

            <div className="space-y-4">
               <div className="flex justify-between items-center text-xs font-mono border-b border-slate-100 dark:border-slate-800 pb-3 transition-colors duration-500">
                 <span className="text-slate-500">Known Entities</span>
                 <span className="text-slate-800 dark:text-white font-bold">{nodes.length} Identified</span>
               </div>
               <div className="flex justify-between items-center text-xs font-mono border-b border-slate-100 dark:border-slate-800 pb-3 transition-colors duration-500">
                 <span className="text-slate-500">Cross-Chain</span>
                 <span className="text-amber-600 dark:text-amber-400 font-bold">{nodes.length > 3 ? 'Binance Bridge' : 'Kadena Native'}</span>
               </div>
               <div className="flex justify-between items-center text-xs font-mono">
                 <span className="text-slate-500">Pact Anchoring</span>
                 <span className="text-emerald-600 dark:text-emerald-500 font-bold flex items-center gap-1"><Lock size={12}/> Verified</span>
               </div>
            </div>
            
            <button 
  onClick={handleAnchor}
  disabled={isAnchoring || isAnchored}
  className={`w-full py-3 mt-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 group ${
    isAnchored ? 'bg-emerald-600 text-white' : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white'
  }`}
>
  {isAnchoring ? (
    <><Loader2 className="w-4 h-4 animate-spin" /> Anchoring to Pact...</>
  ) : isAnchored ? (
    <><ShieldCheck className="w-4 h-4" /> Case Anchored!</>
  ) : (
    <><FileText className="w-4 h-4 group-hover:scale-110 transition-transform" /> Register on Kadena</>
  )}
</button>

          </div>
        )}

        {/* Right Panel: Entity Profiler */}
        {selectedNode && (
          <div className="absolute top-6 right-6 z-10 w-80 bg-white/95 dark:bg-[#080B10]/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-2xl flex flex-col gap-6 transition-colors duration-500 animate-in slide-in-from-right-8">
            <div className="flex justify-between items-start">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                <Fingerprint className="w-3 h-3 text-emerald-500" /> Entity Profiler
              </h2>
              <button onClick={onPaneClick} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
            </div>

            <div className="text-center pb-6 border-b border-slate-100 dark:border-slate-800 transition-colors duration-500">
              <div className={`w-16 h-16 mx-auto rounded-2xl mb-4 flex items-center justify-center ${selectedNode.risk === 'critical' ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500' : selectedNode.risk === 'warning' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500' : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'}`}>
                <Crosshair className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mb-1">{selectedNode.role}</h3>
              <p className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg inline-block transition-colors duration-500">{selectedNode.address}</p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Risk Assessment</p>
                <p className={`text-sm font-bold uppercase ${selectedNode.risk === 'critical' ? 'text-rose-600 dark:text-rose-500' : selectedNode.risk === 'warning' ? 'text-amber-600 dark:text-amber-500' : 'text-emerald-600 dark:text-emerald-500'}`}>{selectedNode.risk} Level</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors duration-500">
  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Volume</p>
  <p className="font-mono font-bold text-slate-700 dark:text-slate-200">
    {parseFloat(selectedNode.volume) === 0 ? "Contract Call" : selectedNode.volume}
  </p>
</div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors duration-500">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total TXs</p>
                  <p className="font-mono font-bold text-slate-700 dark:text-slate-200">{selectedNode.txCount}</p>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">First Interaction</p>
                <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{selectedNode.firstSeen}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State before search */}
        {!isTracing && nodes.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center pointer-events-none">
            <div className="bg-white/60 dark:bg-[#080B10]/60 p-10 rounded-[3rem] backdrop-blur-md border border-slate-200 dark:border-slate-800/80 shadow-2xl transition-colors duration-500">
              <Network className="w-20 h-20 mb-6 text-slate-400 dark:text-slate-600 mx-auto" />
              <h2 className="text-2xl font-black uppercase tracking-widest mb-3 text-slate-800 dark:text-slate-100">Awaiting Trace Target</h2>
              <p className="font-mono text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">Enter a Kadena wallet address or transaction hash to initialize cross-chain forensics.</p>
              <div className="inline-flex items-center gap-2 bg-rose-100 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-4 py-2 rounded-xl">
                <p className="text-xs font-black text-rose-600 dark:text-rose-500 tracking-widest uppercase">Try testing with "k:9999"</p>
              </div>
            </div>
          </div>
        )}

        {/* React Flow Canvas */}
        <div className="flex-1 h-full w-full relative z-0">
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onNodeClick={onNodeClick}
  onPaneClick={onPaneClick}
  nodeTypes={nodeTypes}
  fitView
  fitViewOptions={{ 
    padding: 0.2,       // Tighter padding so nodes fill the screen
    maxZoom: 1.0,       // Max zoom is 100% scale
    minZoom: 0.5        // NEW: Prevents it from zooming out too far!
  }}
  minZoom={0.5}         // NEW: Hard limit on the canvas zoom
  maxZoom={1.5}
  colorMode={theme}
>
            <Background color={theme === 'dark' ? '#1e293b' : '#cbd5e1'} gap={30} size={1} />
            <Controls className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 fill-slate-600 dark:fill-slate-400 shadow-xl" showInteractive={false} />
          </ReactFlow>
        </div>
        
      </main>
    </div>
  );
}