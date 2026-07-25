import fs from 'fs';
import path from 'path';
import {uploadProviders} from './apiService';
import {addGoldBorderToImage} from './imageService';
import {getProgressFile, saveProgressIncrementally, cleanupProgress} from './progressService';

export let currentCancelToken = 0;
export function incrementCancelToken() {
  currentCancelToken++;
}

export async function convertGame(dirPath: string, fileId: string, sender: any, startToken: number, forceRestart: boolean = false): Promise<any> {
  const fullPath = path.join(dirPath, `${fileId}.json`);
  const convertedPath = path.join(dirPath, `${fileId}_converted.json`);
  const pngPath = path.join(dirPath, `${fileId}.png`);
  const convertedPngPath = path.join(dirPath, `${fileId}_converted.png`);
  
  if (fs.existsSync(pngPath)) {
    try {
      await addGoldBorderToImage(pngPath, convertedPngPath);
    } catch (e: any) {
      sender.send('backend:log', `Failed to draw gold border on ${fileId}.png: ${e.message}. Falling back to original image.`, 'error');
      fs.copyFileSync(pngPath, convertedPngPath);
    }
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  
  const imgurRegex = /https?:\/\/(?:i\.)?imgur\.com\/[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)?/g;
  const matches = content.match(imgurRegex) || [];
  const uniqueLinks = [...new Set(matches)];
  const totalCount = uniqueLinks.length;
  
  const { progressPath, progressData } = getProgressFile(dirPath, sender);
  
  if (forceRestart && progressData[fileId]) {
    delete progressData[fileId];
    fs.writeFileSync(progressPath, JSON.stringify(progressData, null, 2), 'utf-8');
  }
  
  const linkMap: Record<string, string> = progressData[fileId]?.linkMap || {};
  let completedCount = Object.keys(linkMap).length;
  
  sender.send('convert:progress', fileId, completedCount, totalCount);
  
  const linksToUpload = uniqueLinks.filter(link => !linkMap[link]);
  
  for (const link of linksToUpload) {
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (startToken !== currentCancelToken) {
        sender.send('backend:log', `[${fileId}] Conversion cancelled by user. Wiping partial progress.`, 'warning');
        cleanupProgress(progressPath, fileId, sender);
        return { success: false, error: 'Cancelled by user' };
      }
      
      try {
        const provider = uploadProviders['catbox-url-upload'];
        linkMap[link] = await provider.uploadUrl(link);
        saveProgressIncrementally(progressPath, fileId, linkMap, completedCount + 1, totalCount, sender);
        break; 
      } catch (e: any) {
        const isLastAttempt = attempt === maxAttempts;
        const errorMsg = e.name === 'AbortError' ? 'Request timed out (15s)' : e.message;
        
        if (isLastAttempt) {
          console.error(`Failed to upload ${link} after 5 attempts`, e);
          sender.send('backend:log', `[${fileId}] Failed to upload ${link} after 5 attempts: ${errorMsg}`, 'error');
        } else {
          sender.send('backend:log', `[${fileId}] Upload attempt ${attempt}/5 failed for ${link}: ${errorMsg}. Retrying...`, 'warning');
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }
    
    completedCount++;
    sender.send('convert:progress', fileId, completedCount, totalCount);
    await new Promise(r => setTimeout(r, 500));
  }
  
  for (const [original, newUrl] of Object.entries(linkMap)) {
    content = content.split(original).join(newUrl);
  }
  
  let originalName = 'Unknown';
  content = content.replace(/"SaveName"\s*:\s*"(.*?)"/, (match, p1) => {
    originalName = p1;
    return `"SaveName": "[C] ${p1}"`;
  });
  content = content.replace(/"GameMode"\s*:\s*"(.*?)"/, (match, p1) => {
    return `"GameMode": "[C] ${p1}"`;
  });
  
  fs.writeFileSync(convertedPath, content, 'utf-8');
  cleanupProgress(progressPath, fileId, sender);
  
  const infosPath = path.join(dirPath, 'WorkshopFileInfos.json');
  if (fs.existsSync(infosPath)) {
    try {
      const infosContent = fs.readFileSync(infosPath, 'utf-8');
      const infos = JSON.parse(infosContent);
      infos.push({
        Directory: convertedPath.replace(/\//g, '\\'),
        Name: `[C] ${originalName}`,
        UpdateTime: Math.floor(Date.now() / 1000)
      });
      fs.writeFileSync(infosPath, JSON.stringify(infos, null, 2), 'utf-8');
    } catch (e: any) {
      sender.send('backend:log', `Failed to update WorkshopFileInfos.json: ${e.message}`, 'error');
    }
  }
  
  return { success: true, newPath: convertedPath, convertedCount: Object.keys(linkMap).length };
}
