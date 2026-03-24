package com.nexusdiet.tracker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityService.TakeScreenshotCallback
import android.accessibilityservice.AccessibilityService.ScreenshotResult
import android.graphics.Bitmap
import android.os.Build
import android.view.Display
import android.view.accessibility.AccessibilityEvent
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import android.util.Log
import java.io.ByteArrayOutputStream
import java.io.IOException

private const val TAG = "NexusDietService"

// Note: this entire idea is sort of a dead end and un-realistic, but going to keep the code in here for now....
class NexusDietService : AccessibilityService() {

    private val client = OkHttpClient()
    // Your Go Backend URL
    //private val backendUrl = "https://r3gal08.duckdns.org/api/ingest-frame" 
    private val backendUrl = "http://192.168.4.230:3000/api/ingest-frame" 

    // TODO: Properly update
    // THE MOST IMPORTANT LINE IN THE APP
    private val whitelistedApps = listOf(
        "com.android.chrome",
        "com.instagram.android",
        "com.reddit.frontpage" // Add more apps you want to track here
    )

    private var lastScreenshotTime = 0L
    private val captureIntervalMs = 5000L // 5 seconds
    private var lastDeniedApp = ""

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        val packageName = event.packageName?.toString() ?: return

        // 1. The Hard Gate (Only capture specific whitelisted apps)
        if (!whitelistedApps.contains(packageName)) {
            if (packageName != lastDeniedApp) {
                Log.d(TAG, "App denied (not in whitelist): $packageName")
                lastDeniedApp = packageName
            }
            return 
        }

        // Throttle screenshots to every ~5 seconds
        val currentTime = System.currentTimeMillis()
        if (currentTime - lastScreenshotTime < captureIntervalMs) {
            return
        }
        lastScreenshotTime = currentTime

        Log.d(TAG, "Triggering screenshot for: $packageName")

        // 2. Take the Screenshot
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            takeScreenshot(Display.DEFAULT_DISPLAY, mainExecutor, object : TakeScreenshotCallback {
                override fun onSuccess(screenshotResult: ScreenshotResult) {
                    val hardwareBuffer = screenshotResult.hardwareBuffer
                    val bitmap = Bitmap.wrapHardwareBuffer(hardwareBuffer, screenshotResult.colorSpace)
                    
                    if (bitmap != null) {
                        sendToBackend(bitmap, packageName)
                    }
                    hardwareBuffer.close() // Prevent memory leaks!
                }

                override fun onFailure(errorCode: Int) {
                    Log.e(TAG, "Failed to take screenshot. Error code: $errorCode")
                }
            })
        }
    }

    private fun sendToBackend(bitmap: Bitmap, sourceApp: String) {
        // Run compression and network execution on a background thread to prevent UI stutter/jank
        Thread {
            try {
                // Compress the image to JPEG to save bandwidth (70% quality)
                val stream = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.JPEG, 70, stream)
                val byteArray = stream.toByteArray()
                bitmap.recycle() // Free memory immediately

                // Build the HTTP POST request
                val requestBody = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("source_app", sourceApp)
                    .addFormDataPart(
                        "screenshot", "frame.jpg",
                        RequestBody.create("image/jpeg".toMediaTypeOrNull(), byteArray)
                    )
                    .build()

                val request = Request.Builder()
                    .url(backendUrl)
                    .post(requestBody)
                    .build()

                // Send it asynchronously so it doesn't freeze the Android UI
                client.newCall(request).enqueue(object : Callback {
                    override fun onFailure(call: Call, e: IOException) {
                        Log.e(TAG, "Network failure sending to backend: ${e.message}")
                        e.printStackTrace()
                    }
                    override fun onResponse(call: Call, response: Response) {
                        Log.i(TAG, "Successfully sent frame from $sourceApp to backend. Status: ${response.code}")
                        response.close()
                    }
                })
            } catch (e: Exception) {
                Log.e(TAG, "Error in sendToBackend: ${e.message}")
                e.printStackTrace()
            }
        }.start()
    }

    override fun onInterrupt() {
        // Required override, fired if the system interrupts the service
    }
}