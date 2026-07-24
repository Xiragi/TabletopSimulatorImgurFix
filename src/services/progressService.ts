import fs from 'fs';
import path from 'path';

export function getProgressFile(dirPath: string, sender?: any) {
  const progressPath = path.join(dirPath, '.ttsprogress');
  let progressData: any = {};
  if (fs.existsSync(progressPath)) {
    try { 
      progressData = JSON.parse(fs.readFileSync(progressPath, 'utf-8')); 
    } catch(e: any) {
      if (sender) sender.send('backend:log', `Failed to read .ttsprogress file: ${e.message}`, 'error');
    }
  }
  return { progressPath, progressData };
}

export function saveProgressIncrementally(progressPath: string, fileId: string, linkMap: Record<string, string>, completedCount: number, totalCount: number, sender?: any) {
  try {
    const currentProg = fs.existsSync(progressPath) ? JSON.parse(fs.readFileSync(progressPath, 'utf-8')) : {};
    currentProg[fileId] = { linkMap, completedCount, totalCount };
    fs.writeFileSync(progressPath, JSON.stringify(currentProg, null, 2), 'utf-8');
  } catch(e: any) {
    if (sender) sender.send('backend:log', `Failed to save progress for ${fileId}: ${e.message}`, 'error');
  }
}

export function cleanupProgress(progressPath: string, fileId: string, sender?: any) {
  try {
    if (fs.existsSync(progressPath)) {
      const currentProg = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
      if (currentProg[fileId]) {
        delete currentProg[fileId];
        fs.writeFileSync(progressPath, JSON.stringify(currentProg, null, 2), 'utf-8');
      }
    }
  } catch(e: any) {
    if (sender) sender.send('backend:log', `Failed to clean up progress for ${fileId}: ${e.message}`, 'error');
  }
}
