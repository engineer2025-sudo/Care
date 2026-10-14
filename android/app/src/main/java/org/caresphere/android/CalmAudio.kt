package org.caresphere.android

import android.media.*
import kotlin.math.*

/** Synthesized sound for relaxation, never a sensor or health measurement. */
class CalmAudio {
    private var track: AudioTrack? = null
    fun play(): Boolean {
        stop()
        return try {
            val rate = 22050
            val samples = ShortArray(rate * 4) { n ->
                val phase = 2.0 * PI * n / rate
                // Integer-cycle components loop without a boundary discontinuity.
                ((sin(phase * 174) + sin(phase * 261) * .35 + sin(phase * 348) * .15) * 2000).toInt().toShort()
            }
            val audio = AudioTrack.Builder()
                .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                .setAudioFormat(AudioFormat.Builder().setSampleRate(rate).setEncoding(AudioFormat.ENCODING_PCM_16BIT).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                .setBufferSizeInBytes(samples.size * 2).setTransferMode(AudioTrack.MODE_STATIC).build()
            track = audio
            check(audio.state == AudioTrack.STATE_INITIALIZED)
            check(audio.write(samples, 0, samples.size) == samples.size)
            check(audio.setLoopPoints(0, samples.size, -1) == AudioTrack.SUCCESS)
            audio.play(); true
        } catch (_: Exception) { stop(); false }
    }
    fun stop() {
        try { track?.stop() } catch (_: Exception) { }
        track?.release(); track = null
    }
}
