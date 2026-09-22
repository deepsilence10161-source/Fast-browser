/**
 * FASTBROWSER - EXACT CHROME UI CONTROLLER & ENGINE
 * Full multi-tab management, mobile tab switcher, omnibox, bookmarks, history, and turbo shields
 */

(function () {
  'use strict';

  // State Management
  const state = {
    tabs: [],
    activeTabId: null,
    isIncognitoMode: false,
    zoomLevel: 100,
    theme: 'dark',
    isDesktopSite: false,
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
    btnStar: document.getElementById('btn-star'),
    btnCopyUrl: document.getElementById('btn-copy-url'),
    btnTurboBadge: document.getElementById('btn-turbo-badge'),
    securityIcon: document.getElementById('security-icon'),

    // Action Extensions
    btnAdblock: document.getElementById('btn-adblock'),
    blockedCountBadge: document.getElementById('blocked-count-badge'),
    btnLmArenaEngine: document.getElementById('btn-lmarena-engine'),
    btnClearData: document.getElementById('btn-clear-data'),
    btnChromeMenu: document.getElementById('btn-chrome-menu'),

    // Mobile Elements
    btnMobileTabs: document.getElementById('btn-mobile-tabs'),
    mobileTabCount: document.getElementById('mobile-tab-count'),
    mobileTabSwitcher: document.getElementById('mobile-tab-switcher'),
    mobileTabCardsContainer: document.getElementById('mobile-tab-cards-container'),
    btnCloseSwitcher: document.getElementById('btn-close-switcher'),
    btnSwitcherNewTab: document.getElementById('btn-switcher-new-tab'),
    tabModeStandard: document.getElementById('tab-mode-standard'),
    tabModeIncognito: document.getElementById('tab-mode-incognito'),

    // Mobile Menu Actions
    menuBtnForward: document.getElementById('menu-btn-forward'),
    menuBtnStar: document.getElementById('menu-btn-star'),
    menuBtnReload: document.getElementById('menu-btn-reload'),
    chkDesktopSite: document.getElementById('chk-desktop-site'),

    // Bookmarks Bar
    bookmarksBar: document.getElementById('bookmarks-bar'),
    btnAddBookmark: document.getElementById('btn-add-bookmark'),

    // Popups & Modals
    popupAdblock: document.getElementById('popup-adblock'),
    chromeMenu: document.getElementById('chrome-menu'),
    modalClearData: document.getElementById('modal-clear-data'),
    
    // Clear Data Form
    selectTimeRange: document.getElementById('select-time-range'),
    chkClearHistory: document.getElementById('chk-clear-history'),
    chkClearCookies: document.getElementById('chk-clear-cookies'),
    chkClearCache: document.getElementById('chk-clear-cache'),
    btnConfirmClear: document.getElementById('btn-confirm-clear'),
    btnCancelClear: document.getElementById('btn-cancel-clear'),
    btnCloseModal: document.getElementById('btn-close-modal')
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

    // 1. Create Desktop Tab Element
    if (DOM.tabsContainer) {
      const tabEl = document.createElement('div');
      tabEl.className = 'chrome-tab';
      tabEl.id = `el-${tabId}`;
      tabEl.innerHTML = `
        <div class="tab-spinner"></div>
        <img class="tab-favicon" src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><circle cx='8' cy='8' r='7' fill='%238ab4f8'/></svg>" alt="">
        <span class="tab-title">New Tab</span>
        <button class="tab-close-btn" title="Close tab">✕</button>
      `;

      tabEl.addEventListener('click', (e) => {
        if (e.target.closest('.tab-close-btn')) return;
        activateTab(tabId);
      });

      tabEl.querySelector('.tab-close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tabId);
      });

      DOM.tabsContainer.appendChild(tabEl);
    }

    // 2. Create Webview / Iframe
    const frame = document.createElement('iframe');
    frame.className = 'tab-view-frame';
    frame.id = `frame-${tabId}`;
    frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups');
    DOM.tabViewsContainer.appendChild(frame);

    frame.addEventListener('load', () => {
      handleTabLoaded(tabId);
    });

    if (shouldActivate) {
      activateTab(tabId);
    }

    navigateTo(tabId, initialUrl);
    updateMobileTabCounter();
    return tabId;
  }

  function activateTab(tabId) {
    state.activeTabId = tabId;
    const tabData = getTab(tabId);
    if (!tabData) return;

    // Update active class on desktop tabs
    document.querySelectorAll('.chrome-tab').forEach(el => {
      el.classList.toggle('active', el.id === `el-${tabId}`);
    });

    // Update active iframe
    document.querySelectorAll('.tab-view-frame').forEach(el => {
      el.classList.toggle('active', el.id === `frame-${tabId}`);
    });

    updateOmniboxDisplay(tabData);
    updateNavButtons(tabData);
    updateMobileTabCounter();
  }

  function closeTab(tabId) {
    const index = state.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    const tabEl = document.getElementById(`el-${tabId}`);
    const frameEl = document.getElementById(`frame-${tabId}`);
    if (tabEl) tabEl.remove();
    if (frameEl) frameEl.remove();

    state.tabs.splice(index, 1);

    if (state.activeTabId === tabId) {
      if (state.tabs.length > 0) {
        const newIndex = Math.max(0, index - 1);
        activateTab(state.tabs[newIndex].id);
      } else {
        createTab('newtab', true);
      }
    }
    updateMobileTabCounter();
    renderMobileTabCards();
  }

  function getTab(tabId) {
    return state.tabs.find(t => t.id === (tabId || state.activeTabId));
  }

  function getSafeFavicon(favicon) {
    if (!favicon) return 'https://www.google.com/favicon.ico';
    if (favicon.startsWith('data:image/svg+xml')) {
      return favicon.replace(/"/g, "'");
    }
    return favicon;
  }

  function updateMobileTabCounter() {
    if (DOM.mobileTabCount) {
      DOM.mobileTabCount.textContent = state.tabs.length;
    }
  }

  // --- MOBILE TAB SWITCHER SCREEN ---

  function openMobileTabSwitcher() {
    renderMobileTabCards();
    DOM.mobileTabSwitcher.classList.add('show');
  }

  function closeMobileTabSwitcher() {
    DOM.mobileTabSwitcher.classList.remove('show');
  }

  function renderMobileTabCards() {
    DOM.mobileTabCardsContainer.innerHTML = '';
    state.tabs.forEach(tab => {
      const card = document.createElement('div');
      card.className = `mobile-tab-card ${tab.id === state.activeTabId ? 'active-tab' : ''}`;
      const safeFav = getSafeFavicon(tab.favicon);
      card.innerHTML = `
        <div class="card-topbar">
          <img class="card-favicon" src="${safeFav}" alt="">
          <span class="card-title">${escapeHtml(tab.title || 'New Tab')}</span>
          <button class="card-close-btn" data-id="${tab.id}">✕</button>
        </div>
        <div class="card-preview">
          <span>${escapeHtml(tab.url === 'newtab' || !tab.url ? 'Search or type URL' : tab.url)}</span>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-close-btn')) return;
        activateTab(tab.id);
        closeMobileTabSwitcher();
      });

      card.querySelector('.card-close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tab.id);
      });

      DOM.mobileTabCardsContainer.appendChild(card);
    });
  }

  DOM.btnMobileTabs.addEventListener('click', openMobileTabSwitcher);
  DOM.btnCloseSwitcher.addEventListener('click', closeMobileTabSwitcher);
  DOM.btnSwitcherNewTab.addEventListener('click', () => {
    createTab('newtab', true);
    closeMobileTabSwitcher();
  });

  // --- NAVIGATION & PROXY SYSTEM ---

  function navigateTo(tabId, targetUrl, isHistoryNavigation = false) {
    const tab = getTab(tabId);
    if (!tab) return;

    let resolvedUrl = targetUrl.trim();
    let displayUrl = resolvedUrl;

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
    } else if (resolvedUrl === 'chrome://settings' || resolvedUrl === 'settings') {
      resolvedUrl = 'settings.html';
      displayUrl = 'chrome://settings';
      tab.title = 'Settings';
      tab.favicon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238ab4f8"><circle cx="12" cy="12" r="8"/></svg>';
    } else if (resolvedUrl === 'chrome://bookmarks' || resolvedUrl === 'bookmarks') {
      resolvedUrl = 'bookmarks.html';
      displayUrl = 'chrome://bookmarks';
      tab.title = 'Bookmarks';
      tab.favicon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23fbbc05"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    } else if (resolvedUrl === 'chrome://downloads' || resolvedUrl === 'downloads') {
      resolvedUrl = 'downloads.html';
      displayUrl = 'chrome://downloads';
      tab.title = 'Downloads';
      tab.favicon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238ab4f8"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>';
    } else if (resolvedUrl === 'demo-lmarena') {
      resolvedUrl = 'lmarena-demo.html';
      displayUrl = 'chrome://lmarena-lag-fixer';
      tab.title = '⚡ LMArena Anti-Lag Demo';
      tab.favicon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f59e0b"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
    } else {
      const isUrl = /^(https?:\/\/|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/.test(resolvedUrl);
      if (!isUrl) {
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

    tab.url = displayUrl;
    tab.isLoading = true;

    if (!isHistoryNavigation) {
      if (tab.historyIndex < tab.history.length - 1) {
        tab.history = tab.history.slice(0, tab.historyIndex + 1);
      }
      tab.history.push(displayUrl);
      tab.historyIndex = tab.history.length - 1;
    }

    const tabEl = document.getElementById(`el-${tabId}`);
    if (tabEl) {
      tabEl.classList.add('loading');
      tabEl.querySelector('.tab-title').textContent = tab.title;
      const favEl = tabEl.querySelector('.tab-favicon');
      if (tab.favicon) favEl.src = tab.favicon;
    }

    startLoadingBar();

    const frame = document.getElementById(`frame-${tabId}`);
    if (frame) {
      frame.src = resolvedUrl;
    }

    if (state.activeTabId === tabId) {
      updateOmniboxDisplay(tab);
      updateNavButtons(tab);
    }

    if (displayUrl && !displayUrl.startsWith('chrome://')) {
      recordHistory(tab.title, displayUrl, tab.favicon);
    }
  }

  function handleTabLoaded(tabId) {
    const tab = getTab(tabId);
    if (!tab) return;

    tab.isLoading = false;
    const tabEl = document.getElementById(`el-${tabId}`);
    if (tabEl) tabEl.classList.remove('loading');

    stopLoadingBar();
    simulateAdblockUpdate();
  }

  function startLoadingBar() {
    DOM.loadingBar.style.width = '30%';
    DOM.loadingBar.style.opacity = '1';
    setTimeout(() => {
      if (DOM.loadingBar.style.opacity === '1') DOM.loadingBar.style.width = '80%';
    }, 200);
  }

  function stopLoadingBar() {
    DOM.loadingBar.style.width = '100%';
    setTimeout(() => {
      DOM.loadingBar.style.opacity = '0';
      setTimeout(() => { DOM.loadingBar.style.width = '0%'; }, 250);
    }, 200);
  }

  // --- OMNIBOX & NAVIGATION ---

  function updateOmniboxDisplay(tab) {
    if (!tab) return;
    DOM.omniboxInput.value = (tab.url === 'newtab.html' || tab.url === 'newtab' || !tab.url) ? '' : tab.url;
  }

  function updateNavButtons(tab) {
    if (!tab) return;
    if (DOM.btnBack) DOM.btnBack.disabled = tab.historyIndex <= 0;
    if (DOM.btnForward) DOM.btnForward.disabled = tab.historyIndex >= tab.history.length - 1;
  }

  if (DOM.btnBack) {
    DOM.btnBack.addEventListener('click', () => {
      const tab = getTab();
      if (tab && tab.historyIndex > 0) {
        tab.historyIndex--;
        navigateTo(tab.id, tab.history[tab.historyIndex], true);
      }
    });
  }

  if (DOM.btnForward) {
    DOM.btnForward.addEventListener('click', () => {
      const tab = getTab();
      if (tab && tab.historyIndex < tab.history.length - 1) {
        tab.historyIndex++;
        navigateTo(tab.id, tab.history[tab.historyIndex], true);
      }
    });
  }

  DOM.btnHome.addEventListener('click', () => {
    navigateTo(state.activeTabId, 'newtab');
  });

  DOM.omniboxInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = DOM.omniboxInput.value.trim();
      if (val) {
        navigateTo(state.activeTabId, val);
        DOM.omniboxInput.blur();
      }
    }
  });

  DOM.btnCopyUrl.addEventListener('click', () => {
    const tab = getTab();
    if (tab && tab.url) {
      navigator.clipboard.writeText(tab.url).then(() => {
        alert('URL copied to clipboard!');
      });
    }
  });

  // --- HISTORY PERSISTENCE & CLEAR DATA (User Requested) ---

  async function recordHistory(title, url, favicon) {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url, favicon })
      });
    } catch {}
  }

  if (DOM.btnClearData) {
    DOM.btnClearData.addEventListener('click', () => {
      DOM.modalClearData.classList.add('show');
    });
  }

  DOM.btnCloseModal.addEventListener('click', () => DOM.modalClearData.classList.remove('show'));
  DOM.btnCancelClear.addEventListener('click', () => DOM.modalClearData.classList.remove('show'));

  DOM.btnConfirmClear.addEventListener('click', async () => {
    const timeRange = DOM.selectTimeRange.value;
    const clearHistory = DOM.chkClearHistory.checked;
    const clearCookies = DOM.chkClearCookies.checked;
    const clearCache = DOM.chkClearCache.checked;

    DOM.btnConfirmClear.textContent = 'Clearing...';
    DOM.btnConfirmClear.disabled = true;

    try {
      await fetch('/api/history/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeRange, clearHistory, clearCache, clearCookies })
      });

      DOM.btnConfirmClear.textContent = 'Cleared ✓';
      setTimeout(() => {
        DOM.modalClearData.classList.remove('show');
        DOM.btnConfirmClear.textContent = 'Clear data';
        DOM.btnConfirmClear.disabled = false;

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

  // --- MENU & POPUPS ---

  DOM.btnChromeMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    DOM.chromeMenu.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.chrome-menu') && !e.target.closest('#btn-chrome-menu')) {
      DOM.chromeMenu.classList.remove('show');
    }
  });

  // Mobile Top Menu Actions
  if (DOM.menuBtnReload) {
    DOM.menuBtnReload.addEventListener('click', () => {
      const tab = getTab();
      if (tab) {
        const frame = document.getElementById(`frame-${tab.id}`);
        if (frame) frame.src = frame.src;
        startLoadingBar();
      }
      DOM.chromeMenu.classList.remove('show');
    });
  }

  if (DOM.menuBtnForward) {
    DOM.menuBtnForward.addEventListener('click', () => {
      const tab = getTab();
      if (tab && tab.historyIndex < tab.history.length - 1) {
        tab.historyIndex++;
        navigateTo(tab.id, tab.history[tab.historyIndex], true);
      }
      DOM.chromeMenu.classList.remove('show');
    });
  }

  // Menu items
  document.getElementById('menu-new-tab').addEventListener('click', () => {
    createTab('newtab', true);
    DOM.chromeMenu.classList.remove('show');
  });

  document.getElementById('menu-new-window').addEventListener('click', () => {
    createTab('newtab', true);
    DOM.chromeMenu.classList.remove('show');
  });

  document.getElementById('menu-history').addEventListener('click', () => {
    navigateTo(state.activeTabId, 'chrome://history');
    DOM.chromeMenu.classList.remove('show');
  });

  document.getElementById('menu-clear-data').addEventListener('click', () => {
    DOM.chromeMenu.classList.remove('show');
    DOM.modalClearData.classList.add('show');
  });

  const bmMenu = document.getElementById('menu-bookmarks');
  if (bmMenu) {
    bmMenu.addEventListener('click', () => {
      navigateTo(state.activeTabId, 'chrome://bookmarks');
      DOM.chromeMenu.classList.remove('show');
    });
  }

  document.getElementById('menu-anti-lag-demo').addEventListener('click', () => {
    navigateTo(state.activeTabId, 'demo-lmarena');
    DOM.chromeMenu.classList.remove('show');
  });

  document.getElementById('menu-adblock-shield').addEventListener('click', () => {
    DOM.chromeMenu.classList.remove('show');
    DOM.popupAdblock.classList.add('show');
    fetchAdblockStats();
  });

  document.getElementById('menu-github').addEventListener('click', () => {
    navigateTo(state.activeTabId, 'https://github.com/deepsilence10161-source/Fast-browser');
    DOM.chromeMenu.classList.remove('show');
  });

  document.getElementById('menu-about').addEventListener('click', () => {
    alert('FastBrowser Mobile & Desktop v1.0.0\nHigh Performance Edition\nMade for deepsilence10161-source');
    DOM.chromeMenu.classList.remove('show');
  });

  // Desktop Site Toggle
  if (DOM.chkDesktopSite) {
    DOM.chkDesktopSite.addEventListener('change', (e) => {
      state.isDesktopSite = e.target.checked;
      const activeFrame = document.querySelector('.tab-view-frame.active');
      if (activeFrame) {
        if (state.isDesktopSite) {
          activeFrame.style.minWidth = '1200px';
          activeFrame.style.transform = 'scale(0.35)';
          activeFrame.style.transformOrigin = '0 0';
        } else {
          activeFrame.style.minWidth = '100%';
          activeFrame.style.transform = 'none';
        }
      }
    });
  }

  function simulateAdblockUpdate() {
    state.adblockStats.blockedRequests += Math.floor(Math.random() * 3) + 1;
    if (DOM.blockedCountBadge) DOM.blockedCountBadge.textContent = state.adblockStats.blockedRequests;
  }

  async function fetchAdblockStats() {
    try {
      const res = await fetch('/api/adblock/stats');
      const data = await res.json();
      document.getElementById('stat-blocked-count').textContent = data.blockedRequests;
      document.getElementById('stat-bandwidth-saved').textContent = data.bandwidthSavedMB + ' MB';
    } catch {}
  }

  // Handle Bookmarks bar clicks
  if (DOM.bookmarksBar) {
    DOM.bookmarksBar.querySelectorAll('.bookmark-item:not(.action-bm)').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.getAttribute('data-url');
        if (url) navigateTo(state.activeTabId, url);
      });
    });
  }

  // Listen to messages from iframes
  window.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'NAVIGATE') {
      navigateTo(state.activeTabId, event.data.url);
    } else if (event.data.type === 'OPEN_CLEAR_DATA_MODAL') {
      DOM.modalClearData.classList.add('show');
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Initialize First Tab
  createTab('newtab', true);
  if (DOM.newTabBtn) {
    DOM.newTabBtn.addEventListener('click', () => createTab('newtab', true));
  }
})();
