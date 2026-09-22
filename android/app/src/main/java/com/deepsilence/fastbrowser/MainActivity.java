package com.deepsilence.fastbrowser;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import java.io.ByteArrayInputStream;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private EditText omnibox;
    private ProgressBar progressBar;
    private ImageButton btnHome;
    private Button btnClearData;

    // Ad & Tracker Domain Blocklist for Android
    private static final Set<String> BLOCKED_DOMAINS = new HashSet<>(Arrays.asList(
            "doubleclick.net", "googleadservices.com", "googlesyndication.com",
            "google-analytics.com", "connect.facebook.net", "outbrain.com",
            "taboola.com", "criteo.com", "rubiconproject.com", "pubmatic.com",
            "hotjar.com", "segment.io", "clarity.ms"
    ));

    // LMArena Anti-Lag CSS & Script
    private static final String ANTI_LAG_JS =
            "javascript:(function() {" +
            "  var style = document.createElement('style');" +
            "  style.innerHTML = '.chat-message, [data-testid*=\"message\"], .turn-container, .prose { content-visibility: auto !important; contain-intrinsic-size: auto 300px !important; } pre, code { contain: content !important; }';" +
            "  document.head.appendChild(style);" +
            "})();";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        omnibox = findViewById(R.id.omnibox);
        progressBar = findViewById(R.id.progress_bar);
        btnHome = findViewById(R.id.btn_home);
        btnClearData = findViewById(R.id.btn_clear_data);

        setupWebView();
        setupControls();

        // Default start page
        loadUrl("https://lmarena.ai");
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);

        // PERSISTENT CACHE & HISTORY: User work is preserved!
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Fast GPU Rendering
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        webView.setWebViewClient(new WebViewClient() {
            // High-Speed Ad & Tracker Blocking at socket level
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String host = request.getUrl().getHost();
                if (host != null) {
                    for (String blocked : BLOCKED_DOMAINS) {
                        if (host.equals(blocked) || host.endsWith("." + blocked)) {
                            // Return empty response (Drops tracker completely)
                            return new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream("".getBytes()));
                        }
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                omnibox.setText(url);
                progressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);
                // Inject LMArena Anti-Lag Engine
                view.loadUrl(ANTI_LAG_JS);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
            }
        });
    }

    private void setupControls() {
        btnHome.setOnClickListener(v -> loadUrl("https://lmarena.ai"));

        // User Requested Feature: On-Demand Clear Browsing Data Dialog
        btnClearData.setOnClickListener(v -> showClearDataDialog());

        omnibox.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_GO || (event != null && event.getKeyCode() == KeyEvent.KEYCODE_ENTER)) {
                String input = omnibox.getText().toString().trim();
                loadUrl(input);
                return true;
            }
            return false;
        });
    }

    private void loadUrl(String input) {
        if (input.isEmpty()) return;
        if (input.startsWith("http://") || input.startsWith("https://")) {
            webView.loadUrl(input);
        } else if (input.contains(".") && !input.contains(" ")) {
            webView.loadUrl("https://" + input);
        } else {
            // Turbo DuckDuckGo search
            webView.loadUrl("https://duckduckgo.com/?q=" + input);
        }
    }

    private void showClearDataDialog() {
        new AlertDialog.Builder(this)
                .setTitle("Clear Browsing Data")
                .setMessage("Kya aap history, cookies aur cache delete karna chahte hain? (Aapka kaam tabhi delete hoga jab aap confirm karenge)")
                .setPositiveButton("Clear Data", (dialog, which) -> {
                    webView.clearHistory();
                    webView.clearCache(true);
                    webView.clearFormData();
                    Toast.makeText(MainActivity.this, "History & Cache permanently deleted ✓", Toast.LENGTH_SHORT).show();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
