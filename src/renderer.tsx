import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Box } from '@mui/material';

import { GameItem } from './types';
import { TopBar } from './components/TopBar';
import { FilterBar } from './components/FilterBar';
import { GameTable } from './components/GameTable';
import { ConsolePane } from './components/ConsolePane';
import './styles.css';

declare global {
  interface Window {
    electronAPI: any;
  }
}

function App() {
  const [dirPath, setDirPath] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<GameItem[]>([]);
  const [logs, setLogs] = useState<{msg: string, type: 'info'|'error'|'warning', time: string}[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  
  const [showOnlyImgur, setShowOnlyImgur] = useState(false);
  const [hideConverted, setHideConverted] = useState(false);
  const [combineRows, setCombineRows] = useState(true);

  const [providerInfo, setProviderInfo] = useState<{name: string, requiresLocalDownload: boolean} | null>(null);
  const [imgurStatus, setImgurStatus] = useState({ text: 'Checking...', status: 'info' });

  useEffect(() => {
    let currentProvider: any = null;

    const fetchInitialData = async () => {
      const defaultPath = await window.electronAPI.getDefaultPath();
      setDirPath(defaultPath);

      const info = await window.electronAPI.getProviderInfo();
      setProviderInfo(info);
      currentProvider = info;
    };
    fetchInitialData().catch(console.error);

    const checkConnectivity = async () => {
      if (currentProvider && !currentProvider.requiresLocalDownload) return;
      
      setImgurStatus({ text: 'Checking...', status: 'info' });
      const result = await window.electronAPI.checkImgur();
      if (result.status === 'connected') {
        setImgurStatus({ text: 'Imgur Reachable', status: 'success' });
      } else if (result.status === 'blocked') {
        setImgurStatus({ text: 'Imgur Blocked (Content Not Available). Please turn on a VPN.', status: 'error' });
      } else if (result.status === 'capacity') {
        setImgurStatus({ text: 'VPN Active, but Imgur is over capacity. Please try again later or change VPN server.', status: 'warning' });
      } else {
        setImgurStatus({ text: 'Imgur Connection Error. Please check your internet.', status: 'error' });
      }
    };
    checkConnectivity().catch(console.error);
    const interval = setInterval(() => {
      checkConnectivity().catch(console.error);
    }, 3 * 60 * 1000);
    
    window.electronAPI.onLog((msg: string, type: 'info' | 'error' | 'warning') => {
      setLogs(prev => [...prev, {msg, type, time: new Date().toLocaleTimeString()}]);
    });

    window.electronAPI.onConvertProgress((fileId: string, completed: number, total: number) => {
      setResults(prev => prev.map(item => {
        if (item.id === fileId) {
          return { ...item, progress: `${completed} / ${total}`, completedCount: completed, convertState: 'Converting...' };
        }
        return item;
      }));
    });

    return () => clearInterval(interval);
  }, []);

  const handleScan = async () => {
    if (!dirPath) return;
    setIsScanning(true);
    setResults([]);
    try {
      const res = await window.electronAPI.scanDirectory(dirPath);
      setResults(res.map((r: any) => ({
        ...r, 
        convertState: r.isResumable ? 'Incomplete' : 'Convert', 
        completedCount: r.savedCompleted || 0,
        progress: r.isResumable ? `${r.savedCompleted} / ${r.savedTotal}` : undefined
      })));
    } catch (err: any) {
      setLogs(prev => [...prev, {msg: `Failed to scan: ${err.message}`, type: 'error', time: new Date().toLocaleTimeString()}]);
    } finally {
      setIsScanning(false);
      setHasScanned(true);
    }
  };

  const handleConvert = async (item: GameItem) => {
    setIsConsoleOpen(true);
    setResults(prev => prev.map(r => r.id === item.id ? { ...r, convertState: 'Queued...' } : r));
    setLogs(prev => [...prev, {msg: `Queued conversion for ${item.id} (${item.saveName})...`, type: 'info', time: new Date().toLocaleTimeString()}]);
    
    const res = await window.electronAPI.convertImgur(dirPath, item.id);
    if (res.success) {
      setResults(prev => prev.map(r => r.id === item.id ? { ...r, convertState: 'Done', isConverted: true, completedCount: r.imgurCount, progress: `${r.imgurCount} / ${r.imgurCount}` } : r));
      setLogs(prev => [...prev, {msg: `Finished converting game: ${item.saveName} (ID: ${item.id}). Replaced ${res.convertedCount} links.`, type: 'info', time: new Date().toLocaleTimeString()}]);
    } else {
      if (res.error === 'Cancelled by user') return;
      setResults(prev => prev.map(r => r.id === item.id ? { ...r, convertState: 'Error' } : r));
      setLogs(prev => [...prev, {msg: `Conversion error for ${item.id}: ${res.error}`, type: 'error', time: new Date().toLocaleTimeString()}]);
    }
  };


  const { displayResults, overallPercent, overallCompleted, overallTotal, activeConversions, incompleteItems } = useMemo(() => {
    const groups = new Map<string, { original: GameItem | null, converted: GameItem[] }>();
    results.forEach(r => {
      const baseId = r.id.replace('_converted', '');
      if (!groups.has(baseId)) groups.set(baseId, { original: null, converted: [] });
      if (r.isConverted) groups.get(baseId)!.converted.push(r);
      else groups.get(baseId)!.original = r;
    });

    let displayResults: GameItem[] = [];
    for (const [baseId, group] of groups.entries()) {
      const hasConverted = group.converted.length > 0;
      
      if (hideConverted && hasConverted) {
        continue;
      }

      if (combineRows) {
        if (hasConverted && !group.original?.hasUpdate) {
          displayResults.push(...group.converted);
        } else if (group.original) {
          displayResults.push(group.original);
        }
      } else {
        if (group.original) displayResults.push(group.original);
        displayResults.push(...group.converted);
      }
    }

    if (showOnlyImgur) {
      displayResults = displayResults.filter(r => r.hasImgur);
    }

    if (search) {
      displayResults = displayResults.filter(r => r.saveName.toLowerCase().includes(search.toLowerCase()));
    }

    let overallTotal = 0;
    let overallCompleted = 0;
    let activeConversions = 0;

    results.forEach(r => {
      if (r.convertState === 'Queued...' || r.convertState === 'Converting...' || r.convertState === 'Incomplete' || (r.convertState === 'Done' && r.completedCount !== undefined)) {
        activeConversions++;
        overallTotal += r.imgurCount;
        overallCompleted += (r.completedCount || 0);
      }
    });

    const overallPercent = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;
    const incompleteItems = results.filter(r => r.convertState === 'Incomplete');

    return { displayResults, overallPercent, overallCompleted, overallTotal, activeConversions, incompleteItems };
  }, [results, search, showOnlyImgur, hideConverted, combineRows]);

  const handleResumeAll = () => {
    incompleteItems.forEach(item => handleConvert(item));
  };

  const handleCancelAll = async () => {
    setLogs(prev => [...prev, {msg: 'Cancelling all active conversions...', type: 'warning', time: new Date().toLocaleTimeString()}]);
    await window.electronAPI.cancelConversions();
    await handleScan();
  };

  const isConvertingAny = results.some(r => r.convertState === 'Queued...' || r.convertState === 'Converting...');

  return (
    <Box className="app-container">
      <Box className="main-column">
        <TopBar 
          dirPath={dirPath} setDirPath={setDirPath} 
          isScanning={isScanning} onScan={handleScan}
          imgurStatus={imgurStatus} providerInfo={providerInfo}
          isConsoleOpen={isConsoleOpen} setIsConsoleOpen={setIsConsoleOpen}
          overallPercent={activeConversions > 0 ? overallPercent : 0} 
          overallCompleted={overallCompleted} overallTotal={activeConversions > 0 ? overallTotal : 0}
          incompleteItems={incompleteItems} onResumeAll={handleResumeAll}
          onCancelAll={handleCancelAll} isConvertingAny={isConvertingAny}
        />
        
        <FilterBar 
          search={search} setSearch={setSearch}
          showOnlyImgur={showOnlyImgur} setShowOnlyImgur={setShowOnlyImgur}
          hideConverted={hideConverted} setHideConverted={setHideConverted}
          combineRows={combineRows} setCombineRows={setCombineRows}
        />
        
        <GameTable displayResults={displayResults} onConvert={handleConvert} hasScanned={hasScanned} />
      </Box>
      
      <ConsolePane logs={logs} isConsoleOpen={isConsoleOpen} />
    </Box>
  );
}

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
