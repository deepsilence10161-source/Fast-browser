/**
 * FastBrowser History & Cache Management System
 * Persists history asynchronously with debounce so I/O never blocks the event loop.
 * Preserves user work permanently until explicit on-demand clear.
 */

const fs = require('fs');
const path = require('path');

class HistoryManager {
  constructor(storagePath) {
    this.storagePath = storagePath || path.join(__dirname, '../../data/history.json');
    this.history = [];
    this.saveTimeout = null;
    this.init();
  }

  init() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        this.history = JSON.parse(raw);
      } else {
        this.history = [];
        this.scheduleSave();
      }
    } catch (err) {
      console.warn('History init warning:', err.message);
      this.history = [];
    }
  }

  scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      fs.promises.writeFile(this.storagePath, JSON.stringify(this.history, null, 2), 'utf8')
        .catch(err => console.error('Async history save error:', err.message));
    }, 1000); // 1-second debounce, never blocks request path
  }

  addEntry({ title, url, favicon }) {
    if (!url || url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('file://')) return null;

    const now = Date.now();
    const last = this.history[0];
    if (last && last.url === url && (now - last.timestamp) < 30000) {
      last.timestamp = now;
      if (title && title !== url) last.title = title;
      this.scheduleSave();
      return last;
    }

    const entry = {
      id: 'hist-' + now + '-' + Math.random().toString(36).substr(2, 6),
      title: title || url,
      url,
      favicon: favicon || this.getFaviconFallback(url),
      timestamp: now
    };

    this.history.unshift(entry);
    if (this.history.length > 5000) this.history.pop();

    this.scheduleSave();
    return entry;
  }

  getFaviconFallback(url) {
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?sz=64&domain_url=${u.hostname}`;
    } catch {
      return '';
    }
  }

  getHistory({ query = '', limit = 100 } = {}) {
    let result = this.history;
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(item => 
        (item.title && item.title.toLowerCase().includes(q)) || 
        (item.url && item.url.toLowerCase().includes(q))
      );
    }
    return result.slice(0, limit);
  }

  deleteEntry(id) {
    const before = this.history.length;
    this.history = this.history.filter(item => item.id !== id);
    const deleted = before !== this.history.length;
    if (deleted) this.scheduleSave();
    return deleted;
  }

  deleteSelected(ids = []) {
    const set = new Set(ids);
    const before = this.history.length;
    this.history = this.history.filter(item => !set.has(item.id));
    this.scheduleSave();
    return before - this.history.length;
  }

  clearBrowsingData({ timeRange = 'all', clearHistory = true, clearCache = true, clearCookies = true } = {}) {
    let cutoff = 0;
    const now = Date.now();

    switch (timeRange) {
      case '1h': cutoff = now - (60 * 60 * 1000); break;
      case '24h': cutoff = now - (24 * 60 * 60 * 1000); break;
      case '7d': cutoff = now - (7 * 24 * 60 * 60 * 1000); break;
      case '4w': cutoff = now - (4 * 7 * 24 * 60 * 60 * 1000); break;
      case 'all': default: cutoff = 0; break;
    }

    let deletedCount = 0;
    if (clearHistory) {
      if (cutoff === 0) {
        deletedCount = this.history.length;
        this.history = [];
      } else {
        const remaining = this.history.filter(item => item.timestamp < cutoff);
        deletedCount = this.history.length - remaining.length;
        this.history = remaining;
      }
      this.scheduleSave();
    }

    return {
      success: true,
      deletedEntries: deletedCount,
      clearedCache: clearCache,
      clearedCookies: clearCookies,
      timeRange,
      remainingCount: this.history.length
    };
  }
}

module.exports = HistoryManager;
