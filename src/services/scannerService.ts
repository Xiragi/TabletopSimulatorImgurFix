import fs from 'fs';
import path from 'path';
import { getProgressFile } from './progressService';

export function scanDirectoryForGames(dirPath: string, sender: any) {
  try {
    const files = fs.readdirSync(dirPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    const results = [];
    const { progressData } = getProgressFile(dirPath, sender);

    for (const file of jsonFiles) {
      const fullPath = path.join(dirPath, file);
      const baseName = path.basename(file, '.json');
      const pngPath = path.join(dirPath, `${baseName}.png`);
      
      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf-8');
      } catch (e: any) {
        sender.send('backend:log', `Failed to read ${file}: ${e.message}`, 'error');
        continue;
      }

      let saveName = "Unknown";
      try {
        const parsed = JSON.parse(content);
        if (parsed.SaveName) saveName = parsed.SaveName;
      } catch (e: any) {
        sender.send('backend:log', `[${baseName}] Standard JSON parsing failed. Falling back to regex. (${e.message})`, 'warning');
        const match = content.match(/"SaveName"\s*:\s*"([^"]+)"/);
        if (match) saveName = match[1];
      }

      const urlRegex = /https?:\/\/[^"\s]+/g;
      const allUrls = content.match(urlRegex) || [];
      const uniqueUrls = [...new Set(allUrls)];
      
      let imgurCount = 0;
      let nonImgurCount = 0;
      for (const url of uniqueUrls) {
        if (url.includes('imgur.com')) {
          imgurCount++;
        } else {
          nonImgurCount++;
        }
      }
      
      const hasImgur = imgurCount > 0;
      const hasPng = fs.existsSync(pngPath);
      const prog = progressData[baseName];

      results.push({
        id: baseName,
        saveName,
        hasImgur,
        imgurCount,
        nonImgurCount,
        imagePath: hasPng ? pngPath : null,
        isConverted: baseName.endsWith('_converted'),
        isResumable: !!prog,
        savedCompleted: prog ? prog.completedCount : 0,
        savedTotal: prog ? prog.totalCount : 0
      });
    }

    const grouped = new Map();
    for (const res of results) {
      let origId = res.id.replace('_converted', '');
      if (!grouped.has(origId)) grouped.set(origId, { original: null, converted: [] });
      if (res.isConverted) {
        grouped.get(origId).converted.push(res);
      } else {
        grouped.get(origId).original = res;
      }
    }

    for (const group of grouped.values()) {
      if (group.original && group.converted.length > 0) {
        try {
          const origPath = path.join(dirPath, `${group.original.id}.json`);
          const convPath = path.join(dirPath, `${group.converted[0].id}.json`);
          
          const origContent = fs.readFileSync(origPath, 'utf-8');
          const convContent = fs.readFileSync(convPath, 'utf-8');
          
          const normalize = (str: string) => str
            .replace(/"SaveName"\s*:\s*".*?"/g, '')
            .replace(/"GameMode"\s*:\s*".*?"/g, '')
            .replace(/https?:\/\/[^"\s]+/g, '');

          // If the changes we see are not the above, then the game updated via workshop and we need to update it.
          if (normalize(origContent) !== normalize(convContent)) {
            group.original.hasUpdate = true;
            group.original.convertState = 'Update Available';
            group.converted.forEach((c: any) => c.hasUpdate = true);
          } else {
            group.original.convertState = 'Already Converted';
          }
        } catch (e: any) {
          sender.send('backend:log', `Failed to check for updates on ${group.original.id}: ${e.message}`, 'warning');
        }
      }
    }

    const sortedGroups = Array.from(grouped.values()).sort((a, b) => {
      const nameA = a.original ? a.original.saveName.toLowerCase() : (a.converted[0] ? a.converted[0].saveName.toLowerCase() : '');
      const nameB = b.original ? b.original.saveName.toLowerCase() : (b.converted[0] ? b.converted[0].saveName.toLowerCase() : '');
      return nameA.localeCompare(nameB);
    });
    
    const finalResults = [];
    for (const group of sortedGroups) {
      if (group.original) finalResults.push(group.original);
      for (const conv of group.converted) {
        finalResults.push(conv);
      }
    }
    
    return finalResults;
  } catch (err: any) {
    sender.send('backend:log', `Scan error: ${err.message}`, 'error');
    return [];
  }
}
