package com.nexusdiet.tracker

import android.content.Context
import android.os.Bundle
import android.service.voice.VoiceInteractionSession
import android.app.assist.AssistStructure
import android.app.assist.AssistContent
import android.view.ContextThemeWrapper
import android.view.LayoutInflater
import android.view.View
import android.widget.TextView
import android.widget.ProgressBar
import android.util.Log
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

class NexusDietAssistSession(context: Context) : VoiceInteractionSession(context) {

    private val TAG = "NexusDietAssistSession"
    // TODO: Update to proper backend IP but also code IP into a env file
    private val backendUrl = "http://192.168.4.230:3000/api/ingest-mobile"
    private val client = OkHttpClient()

    private lateinit var overlayView: View
    private lateinit var statusText: TextView
    private lateinit var progressBar: ProgressBar

    override fun onCreateContentView(): View {
        // VoiceInteractionSession doesn't carry a Material theme, so we must wrap the context
        val themedContext = ContextThemeWrapper(context, com.google.android.material.R.style.Theme_MaterialComponents_DayNight_NoActionBar)
        overlayView = LayoutInflater.from(themedContext).inflate(R.layout.assist_overlay, null)
        statusText = overlayView.findViewById(R.id.assist_status)
        progressBar = overlayView.findViewById(R.id.assist_progress)
        return overlayView
    }

    override fun onHandleAssist(
        state: Bundle?,
        structure: AssistStructure?,
        content: AssistContent?
    ) {
        super.onHandleAssist(state, structure, content)
        Log.d(TAG, "onHandleAssist triggered")
        
        statusText.text = "Extracting text from screen..."
        progressBar.visibility = View.VISIBLE

        Thread {
            try {
                // 1. Traverse AssistStructure to extract visible text
                val extractedText = StringBuilder()
                var contextApp = "unknown"

                if (structure != null) {
                    contextApp = structure.activityComponent?.packageName ?: "unknown"
                    traverseStructure(structure, extractedText)
                }

                val rawText = extractedText.toString()
                Log.d(TAG, "Found ${rawText.length} chars from $contextApp")

                // 2. Local LLM Summarization
                // Using a placeholder approach for Google AI Edge / Gemini Nano
                runOnUiThread { statusText.text = "Summarizing with Local LLM..." }
                val summary = generateLocalSummary(rawText)

                // 3. Send to Go Backend
                runOnUiThread { statusText.text = "Sending to backend..." }
                sendToBackend(contextApp, summary, rawText)

            } catch (e: Exception) {
                Log.e(TAG, "Error in processing assist data", e)
                runOnUiThread {
                    statusText.text = "Error: ${e.message}"
                    progressBar.visibility = View.GONE
                }
            }
        }.start()
    }

    private fun traverseStructure(structure: AssistStructure, builder: StringBuilder) {
        val windowCount = structure.windowNodeCount
        for (i in 0 until windowCount) {
            val windowNode = structure.getWindowNodeAt(i)
            traverseNode(windowNode.rootViewNode, builder)
        }
    }

    private fun traverseNode(node: AssistStructure.ViewNode, builder: StringBuilder) {
        if (node.visibility == View.VISIBLE && !node.text.isNullOrBlank()) {
            builder.append(node.text.toString()).append("\n")
        }
        for (i in 0 until node.childCount) {
            traverseNode(node.getChildAt(i), builder)
        }
    }

    private fun generateLocalSummary(rawText: String): String {
        // TODO: Insert exact Native Gemini Nano / MediaPipe LLM calls here.
        // For example via AI Edge SDK: 
        // val session = LlmInference.createFromOptions(...)
        // return session.generateResponse("Summarize this: $rawText")
        
        // This simulates LLM inference delay to allow UI to update
        Thread.sleep(1500)
        
        // Simple fallback extraction if no LLM config is provided
        return if (rawText.length > 300) {
            rawText.substring(0, 300) + "... [Summarized locally]"
        } else {
            rawText
        }
    }

    private fun sendToBackend(appContext: String, summary: String, rawText: String) {
        try {
            val jsonObject = JSONObject().apply {
                put("device_id", "nexus-pixel-9") // Hardcoded device id for now
                put("context_app", appContext)
                put("summary", summary)
                put("raw_text", rawText)
            }

            val requestBody = jsonObject.toString().toRequestBody("application/json; charset=utf-8".toMediaTypeOrNull())

            val request = okhttp3.Request.Builder()
                .url(backendUrl)
                .post(requestBody)
                .build()

            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    Log.e(TAG, "Network failure sending snippet: ${e.message}")
                    runOnUiThread {
                        statusText.text = "Upload failed."
                        progressBar.visibility = View.GONE
                    }
                }

                override fun onResponse(call: Call, response: Response) {
                    val code = response.code
                    Log.i(TAG, "Successfully sent snippet. Status: $code")
                    runOnUiThread {
                        if (code == 200) {
                            statusText.text = "Saved offline snippet successfully!"
                        } else {
                            statusText.text = "Backend returned $code"
                        }
                        progressBar.visibility = View.GONE
                    }
                    response.close()
                    
                    // Close the session shortly after success
                    Thread.sleep(2000)
                    hide()
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "JSON/Network Error: ${e.message}")
        }
    }

    private fun runOnUiThread(action: () -> Unit) {
        overlayView.post(action)
    }
}
