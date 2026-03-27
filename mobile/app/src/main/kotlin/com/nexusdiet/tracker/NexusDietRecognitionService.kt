package com.nexusdiet.tracker

import android.content.Intent
import android.speech.RecognitionService

class NexusDietRecognitionService : RecognitionService() {
    override fun onStartListening(recognizerIntent: Intent, listener: Callback) {}
    override fun onCancel(listener: Callback) {}
    override fun onStopListening(listener: Callback) {}
}
