# Android App Conversion Guide (WebView Method)

Follow these steps to wrap your ClickEarn web app into a professional Android APK.

## 1. Prerequisites
- Install [Android Studio](https://developer.android.com/studio).
- Your live Web App URL (e.g., `https://your-app.vercel.app`).

---

## 2. Step-by-Step Configuration

### A. AndroidManifest.xml
Open `app/src/main/AndroidManifest.xml` and add these permissions above the `<application>` tag:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<application
    android:hardwareAccelerated="true"
    android:usesCleartextTraffic="true"
    ... >
```

### B. activity_main.xml
Open `app/src/main/res/layout/activity_main.xml` and replace the content with:

```xml
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <WebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

</RelativeLayout>
```

### C. MainActivity.java
Open `app/src/main/java/com/yourname/clickearn/MainActivity.java` and use this code:

```java
package com.yourname.clickearn;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private WebView myWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        myWebView = (WebView) findViewById(R.id.webview);
        WebSettings webSettings = myWebView.getSettings();
        
        // Critical Settings for React Apps
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true); 
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Keep navigation inside the app
        myWebView.setWebViewClient(new WebViewClient());

        // REPLACE THIS WITH YOUR ACTUAL VERCEL URL
        myWebView.loadUrl("https://your-app.vercel.app");
    }

    // Handle back button to go back in web history
    @Override
    public void onBackPressed() {
        if (myWebView.canGoBack()) {
            myWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
```

---

## 3. Important Notes for Telegram Apps
- This app uses **Email/Password Login**, so it will work perfectly as a standalone Android app.
- If the app detects it is NOT inside Telegram, some features like `Telegram.WebApp.initData` might be empty. This is expected and the app is designed to fallback to email login automatically.

## 4. How to Build APK
1. Go to **Build** menu in Android Studio.
2. Select **Build Bundle(s) / APK(s)**.
3. Click **Build APK(s)**.
4. Once finished, click **Locate** in the bottom-right notification to find your `app-debug.apk`.

## 5. App Icon
To change the icon:
1. Right-click `res` folder > **New** > **Image Asset**.
2. Select your logo file and follow the wizard.
