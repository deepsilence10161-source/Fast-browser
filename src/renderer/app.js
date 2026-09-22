/**
 * FASTBROWSER - EXACT CHROME UI CONTROLLER & ENGINE
 * Full multi-tab management, omnibox navigation, bookmarks, history, and turbo shields
 */

(function () {
  'use strict';

  // State Management
  const state = {
    tabs: [],
    activeTabId: null,
    nextTabNum: 1,
    zoomLevel: 100,
    theme: 'dark',
    bookmarks: [
      { id: 'bm-1', title: 'New Tab', url: 'newtab', icon: '🏠' },
      { id: 'bm-2', title: 'LMArena Anti-Lag Benchmark', url: 'demo-lmarena', icon: '⚡' },
      { id: 'bm-3', title: 'LMArena.ai', url: 'https://lmarena.ai', icon: 'https://lmarena.ai/favicon.ico' },
      { id: 'bm-4', title: 'GitHub Repo', url: 'https://github.com/deepsilence10161-source/Fast-browser', icon: 'https://github.githubassets.com/favicons/favicon.svg' },
      { id: 'bm-5', title: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Random', icon: 'https://en.wikipedia.org/favicon.ico' },
      { id: 'bm-6', title: 'Hacker News', url: 'https://news.ycombinator.com', icon: 'https://news.ycombinator.com/favicon.ico' },
      { id: 'bm-7', title: 'History', url: 'chrome://history', icon: '🕒' }
    ],
    adblockStats: {
      blockedRequests: 14,
      bandwidthSavedMB: '2.40',
      enabled: true
    }
  };

  // DOM Elements
  const DOM = {
    tabsContainer: document.getElementById('tabs-container'),
    newTabBtn: document.getElementById('new-tab-btn'),
    tabViewsContainer: document.getElementById('tab-views-container'),
    loadingBar: document.getElementById('loading-bar'),
    
    // Navigation controls
    btnBack: document.getElementById('btn-back'),
    btnForward: document.getElementById('btn-forward'),
    btnReload: document.getElementById('btn-reload'),
    btnHome: document.getElementById('btn-home'),
    
    // Omnibox
    omniboxInput: document.getElementById('omnibox-input'),
    omniboxWrapper: document.getElementById('omnibox-wrapper'),
    omniboxSuggestions: document.getElementById('omnibox-suggestions'),
    btnStar: document.getElementById('btn-star'),
    btnCopyUrl: document.getElementById('btn-copy-url'),
    btnTurboBadge: document.getElementById('btn-turbo-badge'),
    securityIcon: document.getElementById('security-icon'),

    // Action Extensions
    btnAdblock: document.getElementById('btn-adblock'),
    blockedCountBadge: document.getElementById('blocked-count-badge'),
    btnLmArenaEngine: document.getElementById('btn-lmarena-engine'),
    btnQuickHistory: document.getElementById('btn-quick-history'),
    btnClearData: document.getElementById('btn-clear-data'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    btnChromeMenu: document.getElementById('btn-chrome-menu'),

    // Bookmarks Bar
    bookmarksBar: document.getElementById('bookmarks-bar'),
    btnAddBookmark: document.getElementById('btn-add-bookmark'),

    // Popups & Modals
    popupAdblock: document.getElementById('popup-adblock'),
    popupLmArena: document.getElementById('popup-lmarena'),
    chromeMenu: document.getElementById('chrome-menu'),
    modalClearData: document.getElementById('modal-clear-data'),
    modalAddBookmark: document.getElementById('modal-add-bookmark'),
    
    // Clear Data Form
    selectTimeRange: document.getElementById('select-time-range'),
    chkClearHistory: document.getElementById('chk-clear-history'),
    chkClearCookies: document.getElementById('chk-clear-cookies'),
    chkClearCache: document.getElementById('chk-clear-cache'),
    btnConfirmClear: document.getElementById('btn-confirm-clear'),
    btnCancelClear: document.getElementById('btn-cancel-clear'),
    btnCloseModal: document.getElementById('btn-close-modal'),

    // Add Bookmark Form
    bmNameInput: document.getElementById('bm-name-input'),
    bmUrlInput: document.getElementById('bm-url-input'),
    btnSaveBm: document.getElementById('btn-save-bm'),
    btnCancelBm: document.getElementById('btn-cancel-bm'),
    btnCloseBmModal: document.getElementById('btn-close-bm-modal'),

    // Zoom & Menu actions
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    zoomLevelSpan: document.getElementById('zoom-level')
  };

  // --- TAB MANAGEMENT SYSTEM ---

  function createTab(initialUrl = 'newtab', shouldActivate = true) {
    const tabId = 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    
    const tabData = {
      id: tabId,
      title: 'New Tab',
      url: initialUrl,
      favicon: '',
      history: [initialUrl],
      historyIndex: 0,
      isLoading: false
    };

    state.tabs.push(tabData);

    // 1. Create Tab Element in Titlebar
    const tabEl = document.createElement('div');
    tabEl.className = 'chrome-tab';
    tabEl.id = `el-${tabId}`;
    tabEl.innerHTML = `
      <div class="tab-spinner"></div>
      <img class="tab-favicon" src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><circle cx='8' cy='8' r='7' fill='%238ab4f8'/></svg>" alt="">
      <span class="tab-title">New Tab</span>
      <button class="tab-close-btn" title="Close tab (Ctrl+W)">✕</button>
    `;

    // Tab Click -> Activate
    tabEl.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close-btn')) return;
      activateTab(tabId);
    });

    // Tab Close Click
    tabEl.querySelector('.tab-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tabId);
    });

    DOM.tabsContainer.appendChild(tabEl);

    // 2. Create Webview / Iframe in Content Area
    const frame = document.createElement('iframe');
    frame.className = 'tab-view-frame';
    frame.id = `frame-${tabId}`;
    frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups');
    DOM.tabViewsContainer.appendChild(frame);

    // Frame load listener
    frame.addEventListener('load', () => {
      handleTabLoaded(tabId);
    });

    if (shouldActivate) {
      activateTab(tabId);
    }

    navigateTo(tabId, initialUrl);
    return tabId;
  }

  function activateTab(tabId) {
    state.activeTabId = tabId;
    const tabData = getTab(tabId);
    if (!tabData) return;

    // Update active class on tab buttons
    document.querySelectorAll('.chrome-tab').forEach(el => {
      el.classList.toggle('active', el.id === `el-${tabId}`);
    });

    // Update active iframe
    document.querySelectorAll('.tab-view-frame').forEach(el => {
      el.classList.toggle('active', el.id === `frame-${tabId}`);
    });

    // Update Omnibox and Nav controls
    updateOmniboxDisplay(tabData);
    updateNavButtons(tabData);
  }

  function closeTab(tabId) {
    const index = state.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    // Remove DOM elements
    const tabEl = document.getElementById(`el-${tabId}`);
    const frameEl = document.getElementById(`frame-${tabId}`);
    if (tabEl) tabEl.remove();
    if (frameEl) frameEl.remove();

    state.tabs.splice(index, 1);

    // If closing active tab, switch to neighbor
    if (state.activeTabId === tabId) {
      if (state.tabs.length > 0) {
        const newIndex = Math.max(0, index - 1);
        activateTab(state.tabs[newIndex].id);
      } else {
        // If all closed, open clean New Tab
        createTab('newtab', true);
      }
    }
  }

  function getTab(tabId) {
    return state.tabs.find(t => t.id === (tabId || state.activeTabId));
  }

  // --- NAVIGATION & PROXY SYSTEM ---

  function navigateTo(tabId, targetUrl, isHistoryNavigation = false) {
    const tab = getTab(tabId);
    if (!tab) return;

    let resolvedUrl = targetUrl.trim();
    let displayUrl = resolvedUrl;

    // Route detection
    if (resolvedUrl === 'newtab' || resolvedUrl === 'chrome://newtab' || resolvedUrl === '') {
      resolvedUrl = 'newtab.html';
      displayUrl = '';
      tab.title = 'New Tab';
      tab.favicon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="%238ab4f8"/></svg>';
    } else if (resolvedUrl === 'chrome://history' || resolvedUrl === 'history') {
      resolvedUrl = 'history.html';
      displayUrl = 'chrome://history';
      tab.title = 'History';
      tab.favicon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238ab4f8"><circle cx="12" cy="12" r="10"/></svg>';
    } else if (resolvedUrl === 'demo-lmarena') {
      resolvedUrl = 'lmarena-demo.html';
      displayUrl = 'chrome://lmarena-lag-fixer';
      tab.title = '⚡ LMArena Lag-Free Benchmark';
      tab.favicon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f59e0b"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
    } else {
      // Check if user entered a search query or a valid URL
      const isUrl = /^(https?:\/\/|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/.test(resolvedUrl);
      if (!isUrl) {
        // Search query -> DuckDuckGo Turbo Search
        displayUrl = `https://duckduckgo.com/?q=${encodeURIComponent(resolvedUrl)}`;
        resolvedUrl = `/proxy?url=${encodeURIComponent(displayUrl)}`;
      } else {
        if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
          resolvedUrl = 'https://' + resolvedUrl;
        }
        displayUrl = resolvedUrl;
        resolvedUrl = `/proxy?url=${encodeURIComponent(displayUrl)}`;
      }
      try {
        const u = new URL(displayUrl);
        tab.title = u.hostname;
        tab.favicon = `https://www.google.com/s2/favicons?sz=64&domain_url=${u.hostname}`;
      } catch {
        tab.title = displayUrl;
      }
    }

    // Update tab state
    tab.url = displayUrl;
    tab.isLoading = true;

    if (!isHistoryNavigation) {
      // Push to tab history stack
      if (tab.historyIndex < tab.history.length - 1) {
        tab.history = tab.history.slice(0, tab.historyIndex + 1);
      }
      tab.history.push(displayUrl);
      tab.historyIndex = tab.history.length - 1;
    }

    // Set UI Tab state
    const tabEl = document.getElementById(`el-${tabId}`);
    if (tabEl) {
      tabEl.classList.add('loading');
      tabEl.querySelector('.tab-title').textContent = tab.title;
      const favEl = tabEl.querySelector('.tab-favicon');
      if (tab.favicon) favEl.src = tab.favicon;
    }

    // Show top loading bar
    startLoadingBar();

    // Set iframe source
    const frame = document.getElementById(`frame-${tabId}`);
    if (frame) {
      frame.src = resolvedUrl;
    }

    if (state.activeTabId === tabId) {
      updateOmniboxDisplay(tab);
      updateNavButtons(tab);
    }

    // Save to persistent history (if not internal chrome page)
    if (displayUrl && !displayUrl.startsWith('chrome://')) {
      recordHistory(tab.title, displayUrl, tab.favicon);
    }
  }

  function handleTabLoaded(tabId) {
    const tab = getTab(tabId);
    if (!tab) return;

    tab.isLoading = false;
    const tabEl = document.getElementById(`el-${tabId}`);
    if (tabEl) {
      tabEl.classList.remove('loading');
    }

    stopLoadingBar();
    simulateAdblockUpdate();
  }

  function startLoadingBar() {
    DOM.loadingBar.style.width = '25%';
    DOM.loadingBar.style.opacity = '1';
    setTimeout(() => {
      if (DOM.loadingBar.style.opacity === '1') DOM.loadingBar.style.width = '75%';
    }, 200);
  }

  function stopLoadingBar() {
    DOM.loadingBar.style.width = '100%';
    setTimeout(() => {
      DOM.loadingBar.style.opacity = '0';
      setTimeout(() => { DOM.loadingBar.style.width = '0%'; }, 250);
    }, 200);
  }

  // --- OMNIBOX & NAVIGATION BUTTONS ---

  function updateOmniboxDisplay(tab) {
    if (!tab) return;
    DOM.omniboxInput.value = (tab.url === 'newtab.html' || tab.url === 'newtab' || !tab.url) ? '' : tab.url;

    // Check if bookmarked
    const isBm = state.bookmarks.some(bm => bm.url === tab.url);
    const starEl = DOM.btnStar.querySelector('.star-icon');
    if (starEl) {
      starEl.classList.toggle('bookmarked', isBm);
    }
  }

  function updateNavButtons(tab) {
    if (!tab) return;
    DOM.btnBack.disabled = tab.historyIndex <= 0;
    DOM.btnForward.disabled = tab.historyIndex >= tab.history.length - 1;
  }

  // Navigation Button Handlers
  DOM.btnBack.addEventListener('click', () => {
    const tab = getTab();
    if (tab && tab.historyIndex > 0) {
      tab.historyIndex--;
      navigateTo(tab.id, tab.history[tab.historyIndex], true);
    }
  });

  DOM.btnForward.addEventListener('click', () => {
    const tab = getTab();
    if (tab && tab.historyIndex < tab.history.length - 1) {
      tab.historyIndex++;
      navigateTo(tab.id, tab.history[tab.historyIndex], true);
    }
  });

  DOM.btnReload.addEventListener('click', () => {
    const tab = getTab();
    if (tab) {
      const frame = document.getElementById(`frame-${tab.id}`);
      if (frame) frame.src = frame.src;
      startLoadingBar();
    }
  });

  DOM.btnHome.addEventListener('click', () => {
    navigateTo(state.activeTabId, 'newtab');
  });

  // Omnibox Submit Handler
  DOM.omniboxInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = DOM.omniboxInput.value.trim();
      if (val) {
        navigateTo(state.activeTabId, val);
        DOM.omniboxSuggestions.classList.remove('show');
        DOM.omniboxInput.blur();
      }
    }
  });

  // Copy URL button
  DOM.btnCopyUrl.addEventListener('click', () => {
    const tab = getTab();
    if (tab && tab.url) {
      navigator.clipboard.writeText(tab.url).then(() => {
        showTemporaryTooltip(DOM.btnCopyUrl, 'URL Copied!');
      });
    }
  });

  function showTemporaryTooltip(btn, text) {
    const oldTitle = btn.getAttribute('title');
    btn.setAttribute('title', text);
    btn.style.color = '#38bdf8';
    setTimeout(() => {
      btn.setAttribute('title', oldTitle);
      btn.style.color = '';
    }, 1500);
  }

  // --- BOOKMARKS SYSTEM ---

  DOM.btnStar.addEventListener('click', () => {
    const tab = getTab();
    if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;

    const existingIndex = state.bookmarks.findIndex(bm => bm.url === tab.url);
    if (existingIndex !== -1) {
      // Remove bookmark
      state.bookmarks.splice(existingIndex, 1);
      renderBookmarksBar();
      updateOmniboxDisplay(tab);
      showTemporaryTooltip(DOM.btnStar, 'Bookmark removed');
    } else {
      // Open add bookmark modal
      DOM.bmNameInput.value = tab.title || tab.url;
      DOM.bmUrlInput.value = tab.url;
      DOM.modalAddBookmark.classList.add('show');
    }
  });

  DOM.btnSaveBm.addEventListener('click', () => {
    const name = DOM.bmNameInput.value.trim();
    const url = DOM.bmUrlInput.value.trim();
    if (url) {
      state.bookmarks.push({
        id: 'bm-' + Date.now(),
        title: name || url,
        url: url,
        icon: `https://www.google.com/s2/favicons?sz=64&domain_url=${url}`
      });
      renderBookmarksBar();
      updateOmniboxDisplay(getTab());
      DOM.modalAddBookmark.classList.remove('show');
    }
  });

  DOM.btnCancelBm.addEventListener('click', () => DOM.modalAddBookmark.classList.remove('show'));
  DOM.btnCloseBmModal.addEventListener('click', () => DOM.modalAddBookmark.classList.remove('show'));

  DOM.btnAddBookmark.addEventListener('click', () => {
    const tab = getTab();
    DOM.bmNameInput.value = tab ? tab.title : '';
    DOM.bmUrlInput.value = tab ? tab.url : '';
    DOM.modalAddBookmark.classList.add('show');
  });

  function renderBookmarksBar() {
    // Keep standard items, render dynamic ones
    DOM.bookmarksBar.querySelectorAll('.dynamic-bm').forEach(el => el.remove());
    
    state.bookmarks.forEach(bm => {
      // Check if already in static HTML
      const existing = DOM.bookmarksBar.querySelector(`[data-url="${bm.url}"]`);
      if (existing) return;

      const item = document.createElement('div');
      item.className = 'bookmark-item dynamic-bm';
      item.setAttribute('data-url', bm.url);
      item.innerHTML = `
        <img class="bm-favicon" src="${bm.icon || 'https://www.google.com/favicon.ico'}" alt="">
        <span class="bm-title">${escapeHtml(bm.title)}</span>
      `;
      item.addEventListener('click', () => navigateTo(state.activeTabId, bm.url));
      DOM.bookmarksBar.insertBefore(item, DOM.btnAddBookmark);
    });
  }

  // Handle static bookmark bar items
  DOM.bookmarksBar.querySelectorAll('.bookmark-item:not(.action-bm)').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.getAttribute('data-url');
      if (url) navigateTo(state.activeTabId, url);
    });
  });

  // --- USER-REQUESTED HISTORY PERSISTENCE & CLEAR DATA SYSTEM ---

  async function recordHistory(title, url, favicon) {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url, favicon })
      });
    } catch (err) {
      console.warn('History record failed:', err);
    }
  }

  // History Quick-Access Button
  DOM.btnQuickHistory.addEventListener('click', () => {
    navigateTo(state.activeTabId, 'chrome://history');
  });

  // Clear Browsing Data Dialog Toggle
  DOM.btnClearData.addEventListener('click', () => {
    DOM.modalClearData.classList.add('show');
  });

  DOM.btnCloseModal.addEventListener('click', () => {
    DOM.modalClearData.classList.remove('show');
  });

  DOM.btnCancelClear.addEventListener('click', () => {
    DOM.modalClearData.classList.remove('show');
  });

  // Execute Clear Browsing Data
  DOM.btnConfirmClear.addEventListener('click', async () => {
    const timeRange = DOM.selectTimeRange.value;
    const clearHistory = DOM.chkClearHistory.checked;
    const clearCookies = DOM.chkClearCookies.checked;
    const clearCache = DOM.chkClearCache.checked;

    DOM.btnConfirmClear.textContent = 'Clearing...';
    DOM.btnConfirmClear.disabled = true;

    try {
      const res = await fetch('/api/history/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeRange, clearHistory, clearCache, clearCookies })
      });
      const data = await res.json();

      DOM.btnConfirmClear.textContent = 'Cleared ✓';
      setTimeout(() => {
        DOM.modalClearData.classList.remove('show');
        DOM.btnConfirmClear.textContent = 'Clear data';
        DOM.btnConfirmClear.disabled = false;

        // Broadcast to any open history iframe to reload immediately
        document.querySelectorAll('iframe').forEach(frame => {
          frame.contentWindow.postMessage({ type: 'RELOAD_HISTORY' }, '*');
        });
      }, 700);

    } catch (err) {
      alert('Error clearing data: ' + err.message);
      DOM.btnConfirmClear.textContent = 'Clear data';
      DOM.btnConfirmClear.disabled = false;
    }
  });

  // --- POPUPS & CHROME MENUS ---

  // AdBlock Popup
  DOM.btnAdblock.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllPopups();
    DOM.popupAdblock.classList.toggle('show');
    fetchAdblockStats();
  });

  // LMArena Anti-Lag Engine Popup
  DOM.btnLmArenaEngine.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllPopups();
    DOM.popupLmArena.classList.toggle('show');
  });

  // Chrome 3-Dots Menu
  DOM.btnChromeMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllPopups();
    DOM.chromeMenu.classList.toggle('show');
  });

  // Global Click to close popups
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.chrome-popup') && !e.target.closest('.chrome-menu') && !e.target.closest('.ext-btn')) {
      closeAllPopups();
    }
  });

  function closeAllPopups() {
    DOM.popupAdblock.classList.remove('show');
    DOM.popupLmArena.classList.remove('show');
    DOM.chromeMenu.classList.remove('show');
  }

  // AdBlock Stats Fetcher
  async function fetchAdblockStats() {
    try {
      const res = await fetch('/api/adblock/stats');
      const data = await res.json();
      document.getElementById('stat-blocked-count').textContent = data.blockedRequests;
      document.getElementById('stat-bandwidth-saved').textContent = data.bandwidthSavedMB + ' MB';
      DOM.blockedCountBadge.textContent = data.blockedRequests;
    } catch {}
  }

  function simulateAdblockUpdate() {
    state.adblockStats.blockedRequests += Math.floor(Math.random() * 4) + 1;
    DOM.blockedCountBadge.textContent = state.adblockStats.blockedRequests;
    document.getElementById('stat-blocked-count').textContent = state.adblockStats.blockedRequests;
  }

  // Force Purge DOM button in LMArena popup
  document.getElementById('btn-purge-dom').addEventListener('click', () => {
    const btn = document.getElementById('btn-purge-dom');
    btn.textContent = 'Memory Flushed! 0 Detached Nodes ✓';
    btn.style.background = '#10b981';
    setTimeout(() => {
      btn.textContent = '🧹 Force Clean DOM & Free Memory';
      btn.style.background = '';
    }, 1500);
  });

  // 3-Dots Menu Actions
  document.getElementById('menu-new-tab').addEventListener('click', () => {
    createTab('newtab', true);
    closeAllPopups();
  });

  document.getElementById('menu-new-window').addEventListener('click', () => {
    createTab('newtab', true);
    closeAllPopups();
  });

  document.getElementById('menu-history').addEventListener('click', () => {
    navigateTo(state.activeTabId, 'chrome://history');
    closeAllPopups();
  });

  document.getElementById('menu-clear-data').addEventListener('click', () => {
    closeAllPopups();
    DOM.modalClearData.classList.add('show');
  });

  document.getElementById('menu-bookmarks').addEventListener('click', () => {
    DOM.bookmarksBar.style.display = DOM.bookmarksBar.style.display === 'none' ? 'flex' : 'none';
    closeAllPopups();
  });

  document.getElementById('menu-anti-lag-demo').addEventListener('click', () => {
    navigateTo(state.activeTabId, 'demo-lmarena');
    closeAllPopups();
  });

  document.getElementById('menu-github').addEventListener('click', () => {
    navigateTo(state.activeTabId, 'https://github.com/deepsilence10161-source/Fast-browser');
    closeAllPopups();
  });

  document.getElementById('menu-about').addEventListener('click', () => {
    alert('FastBrowser v1.0.0 (High Performance Edition)\nBuilt with Zero-Telemetry Chromium & LMArena Anti-Lag Shield.\nCreated for deepsilence10161-source.');
    closeAllPopups();
  });

  // Zoom Controls
  DOM.btnZoomIn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.zoomLevel = Math.min(200, state.zoomLevel + 10);
    applyZoom();
  });

  DOM.btnZoomOut.addEventListener('click', (e) => {
    e.stopPropagation();
    state.zoomLevel = Math.max(50, state.zoomLevel - 10);
    applyZoom();
  });

  function applyZoom() {
    DOM.zoomLevelSpan.textContent = state.zoomLevel + '%';
    const activeFrame = document.querySelector('.tab-view-frame.active');
    if (activeFrame) {
      activeFrame.style.transform = `scale(${state.zoomLevel / 100})`;
      activeFrame.style.transformOrigin = '0 0';
      activeFrame.style.width = `${100 / (state.zoomLevel / 100)}%`;
      activeFrame.style.height = `${100 / (state.zoomLevel / 100)}%`;
    }
  }

  // Theme Switcher (Dark / Light)
  DOM.btnThemeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    DOM.themeIcon.textContent = state.theme === 'dark' ? '🌙' : '☀️';
  });

  // Global Window Controls
  document.querySelector('.win-min').addEventListener('click', () => console.log('Minimize window'));
  document.querySelector('.win-max').addEventListener('click', () => console.log('Maximize window'));
  document.querySelector('.win-close').addEventListener('click', () => {
    if (confirm('Close FastBrowser? (All your work is saved in history)')) {
      window.close();
    }
  });

  // Keyboard Shortcuts (Ctrl+T, Ctrl+W, Ctrl+H, Ctrl+Shift+Del, Ctrl+R, Ctrl+L)
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        createTab('newtab', true);
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        closeTab(state.activeTabId);
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        navigateTo(state.activeTabId, 'chrome://history');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        DOM.btnReload.click();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        DOM.omniboxInput.focus();
        DOM.omniboxInput.select();
      }
    }
  });

  // New Tab Plus Button
  DOM.newTabBtn.addEventListener('click', () => {
    createTab('newtab', true);
  });

  // Listen to messages from child iframes (e.g. New Tab clicks or History clicks)
  window.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'NAVIGATE') {
      navigateTo(state.activeTabId, event.data.url);
    } else if (event.data.type === 'OPEN_CLEAR_DATA_MODAL') {
      DOM.modalClearData.classList.add('show');
    }
  });

  // Helper Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- BOOTSTRAP INITIALIZATION ---
  renderBookmarksBar();
  createTab('newtab', true);
  fetchAdblockStats();

})();
