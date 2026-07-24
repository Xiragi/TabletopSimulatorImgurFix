export interface UploadProvider {
  id: string;
  name: string;
  requiresLocalDownload: boolean;
  uploadUrl(link: string): Promise<string>;
}

export class CatboxUrlProvider implements UploadProvider {
  id = 'catbox-url-upload';
  name = 'Catbox.moe (URL Upload)';
  requiresLocalDownload = false;

  async uploadUrl(link: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); 
    
    try {
      const body = new FormData();
      body.append('reqtype', 'urlupload');
      body.append('url', link);
      
      const res = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: body as any,
        signal: controller.signal
      });
      
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      
      const catboxUrl = await res.text();
      if (!catboxUrl.startsWith('http')) {
        throw new Error(`Catbox API returned invalid URL: ${catboxUrl}`);
      }
      return catboxUrl;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}


export const uploadProviders: Record<string, UploadProvider> = {
  'catbox-url-upload': new CatboxUrlProvider()
};

export async function checkImgurConnectivity() {
  try {
    const res = await fetch('https://imgur.com', { method: 'GET', redirect: 'follow' });
    const text = await res.text();
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('imgur is temporarily over capacity')) return { status: 'capacity' };
    if (lowerText.includes('content not available') || lowerText.includes('conent not available')) return { status: 'blocked' };
    if (res.ok) return { status: 'connected' };
    
    return { status: 'error' };
  } catch (e) {
    return { status: 'error' };
  }
}
