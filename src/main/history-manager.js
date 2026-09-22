/**
 * FastBrowser History & Cache Management System
 * Persists history so user never loses their ongoing work.
 * Provides on-demand single-click erasure via History / Clear Browsing Data dialog.
 */

const fs = require('fs');
const path = require('path');

class HistoryManager {
  constructor(storagePath) {
    this.storagePath = storagePath || path.join(__dirname, '../../data/history.json');
    this.history = [];
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
        // Default initial history showcasing capabilities
        this.history = [
          {
            id: 'hist-' + Date.now() + '-1',
            title: 'LMArena.ai - Free AI Agent Arena & Benchmarks',
            url: 'https://lmarena.ai',
            favicon: 'https://lmarena.ai/favicon.ico',
            timestamp: Date.now() - 1000 * 60 * 15 // 15 mins ago
          },
          {
            id: 'hist-' + Date.now() + '-2',
            title: 'GitHub: Fast-browser Repository',
            url: 'https://github.com/deepsilence10161-source/Fast-browser',
            favicon: 'https://github.githubassets.com/favicons/favicon.svg',
            timestamp: Date.now() - 1000 * 60 * 45 // 45 mins ago
          },
          {
            id: 'hist-' + Date.now() + '-3',
            title: 'Google Search: High Performance Chromium Engine Flags',
            url: 'https://www.google.com/search?q=high+performance+chromium+engine+flags',
            favicon: 'https://www.google.com/favicon.ico',
            timestamp: Date.now() - 1000 * 60 * 90 // 1.5 hours ago
          }
        ];
        this.save();
      }
    } catch (err) {
      console.warn('History init warning:', err.message);
      this.history = [];
    }
  }

  save() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storagePath, JSON.stringify(this.history, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save history:', err.message);
    }
  }

  addEntry({ title, url, favicon }) {
    if (!url || url.startsWith('chrome://') || url.startsWith('about:')) return null;

    // Deduplicate consecutive visits to identical URL within 30 seconds
    const now = Date.now();
    const last = this.history[0];
    if (last && last.url === url && (now - last.timestamp) < 30000) {
      last.timestamp = now;
      if (title && title !== url) last.title = title;
      this.save();
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
    // Keep maximum 5,000 entries
    if (this.history.length > 5000) {
      this.history.pop();
    }

    this.save();
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
    const beforeCount = this.history.length;
    this.history = this.history.filter(item => item.id !== id);
    const deleted = beforeCount !== this.history.length;
    if (deleted) this.save();
    return deleted;
  }

  deleteSelected(ids = []) {
    const set = new Set(ids);
    const beforeCount = this.history.length;
    this.history = this.history.filter(item => !set.has(item.id));
    this.save();
    return beforeCount - this.history.length;
  }

  clearBrowsingData({ timeRange = 'all', clearHistory = true, clearCache = true, clearCookies = true } = {}) {
    let cutoff = 0;
    const now = Date.now();

    switch (timeRange) {
      case '1h':
        cutoff = now - (60 * 60 * 1000);
        break;
      case '24h':
        cutoff = now - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoff = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case '4w':
        cutoff = now - (4 * 7 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        cutoff = 0;
        break;
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
      this.save();
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
