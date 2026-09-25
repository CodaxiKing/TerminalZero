package com.terminalzero.app

import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.FFprobeKit
import com.arthenica.ffmpegkit.ReturnCode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.util.Locale
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToLong

data class MediaInfo(val duration: Double, val width: Int, val height: Int, val fps: String, val hasAudio: Boolean)

data class PlannedSegment(val index: Int, val start: Double, val end: Double)

/** Divisão e junção dos vídeos com FFmpeg (mesma lógica da versão web). */
object Video {
    private fun num(v: Double) = String.format(Locale.US, "%.3f", v)

    private fun round3(v: Double) = (v * 1000).roundToLong() / 1000.0

    suspend fun probe(file: File): MediaInfo = withContext(Dispatchers.IO) {
        val session = FFprobeKit.executeWithArguments(
            arrayOf(
                "-v", "error",
                "-show_entries", "format=duration:stream=codec_type,width,height,avg_frame_rate,r_frame_rate",
                "-of", "json",
                file.absolutePath,
            )
        )
        val out = session.output ?: ""
        val start = out.indexOf('{')
        val end = out.lastIndexOf('}')
        if (!ReturnCode.isSuccess(session.returnCode) || start < 0 || end <= start) {
            throw IllegalStateException("Não foi possível ler o vídeo ${file.name}.")
        }
        val json = JSONObject(out.substring(start, end + 1))
        val streams = json.optJSONArray("streams")
        var video: JSONObject? = null
        var hasAudio = false
        if (streams != null) {
            for (i in 0 until streams.length()) {
                val s = streams.getJSONObject(i)
                when (s.optString("codec_type")) {
                    "video" -> if (video == null) video = s
                    "audio" -> hasAudio = true
                }
            }
        }
        val rate = listOf(video?.optString("avg_frame_rate"), video?.optString("r_frame_rate"))
            .firstOrNull { !it.isNullOrEmpty() && !it.startsWith("0") } ?: "30"
        MediaInfo(
            duration = json.optJSONObject("format")?.optString("duration")?.toDoubleOrNull() ?: 0.0,
            width = video?.optInt("width") ?: 0,
            height = video?.optInt("height") ?: 0,
            fps = rate,
            hasAudio = hasAudio,
        )
    }

    /** Executa o ffmpeg; `onTime` recebe os segundos já processados do vídeo de saída. */
    private suspend fun ffmpeg(args: List<String>, onTime: (Double) -> Unit = {}) =
        suspendCancellableCoroutine<Unit> { cont ->
            val session = FFmpegKit.executeWithArgumentsAsync(
                args.toTypedArray(),
                { s ->
                    when {
                        ReturnCode.isSuccess(s.returnCode) -> cont.resume(Unit)
                        ReturnCode.isCancel(s.returnCode) -> cont.cancel()
                        else -> cont.resumeWithException(
                            IllegalStateException("ffmpeg falhou:\n" + (s.allLogsAsString ?: "").takeLast(2000))
                        )
                    }
                },
                null,
                { stats -> onTime(stats.time / 1000.0) },
            )
            cont.invokeOnCancellation { FFmpegKit.cancel(session.sessionId) }
        }

    /**
     * Menor número de partes iguais com no máximo `maxSeconds` cada — sempre para menos,
     * nunca para mais (ex.: 12s com máx. 5s -> 3 partes de 4s).
     */
    fun plan(duration: Double, maxSeconds: Int): List<PlannedSegment> {
        val count = max(1, ceil(duration / maxSeconds - 1e-6).toInt())
        val length = duration / count
        return (0 until count).map { i ->
            PlannedSegment(i, round3(i * length), round3(if (i == count - 1) duration else (i + 1) * length))
        }
    }

    /** Corta o vídeo nas partes planejadas. Recodifica para o corte ser exato. */
    suspend fun split(input: File, outDir: File, maxSeconds: Int, onProgress: (Double) -> Unit): Pair<Double, List<Segment>> {
        outDir.mkdirs()
        val duration = probe(input).duration
        val segments = plan(duration, maxSeconds).map { seg ->
            val length = seg.end - seg.start
            val file = File(outDir, "parte_%02d.mp4".format(seg.index + 1))
            ffmpeg(
                listOf(
                    "-y",
                    "-ss", num(seg.start),
                    "-i", input.absolutePath,
                    "-t", num(length),
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k",
                    "-movflags", "+faststart",
                    file.absolutePath,
                )
            ) { t -> onProgress((seg.start + min(t, length)) / duration) }
            Segment(seg.index, seg.start, seg.end, file.name)
        }
        onProgress(1.0)
        return duration to segments
    }

    /**
     * Junta os vídeos em sequência, na resolução e no FPS do primeiro. Com `crossfade`, o último
     * quadro de cada parte é estendido pelo tempo da transição, então a duração total não muda e
     * o áudio original continua sincronizado.
     */
    suspend fun concat(inputs: List<File>, output: File, audioFrom: File?, crossfade: Double, onProgress: (Double) -> Unit) {
        val infos = inputs.map { probe(it) }
        val first = infos[0]
        val w = first.width - first.width % 2
        val h = first.height - first.height % 2
        val fade = if (inputs.size > 1) max(0.0, crossfade) else 0.0
        val total = infos.sumOf { it.duration }
        val useAudio = audioFrom != null && probe(audioFrom).hasAudio

        val args = mutableListOf("-y")
        inputs.forEach { args += listOf("-i", it.absolutePath) }
        if (useAudio) args += listOf("-i", audioFrom!!.absolutePath)

        val filters = mutableListOf<String>()
        inputs.indices.forEach { i ->
            val pad = if (fade > 0 && i < inputs.size - 1) ",tpad=stop_mode=clone:stop_duration=${num(fade)}" else ""
            filters += "[$i:v]scale=$w:$h:force_original_aspect_ratio=decrease," +
                "pad=$w:$h:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${first.fps},format=yuv420p$pad,settb=AVTB[v$i]"
        }
        if (fade > 0) {
            var label = "v0"
            var offset = 0.0
            for (i in 1 until inputs.size) {
                offset += infos[i - 1].duration
                val out = if (i == inputs.size - 1) "outv" else "x$i"
                filters += "[$label][v$i]xfade=transition=fade:duration=${num(fade)}:offset=${num(offset)}[$out]"
                label = out
            }
        } else {
            filters += inputs.indices.joinToString("") { "[v$it]" } + "concat=n=${inputs.size}:v=1:a=0[outv]"
        }
        args += listOf("-filter_complex", filters.joinToString(";"), "-map", "[outv]")
        if (useAudio) args += listOf("-map", "${inputs.size}:a:0", "-c:a", "aac", "-b:a", "192k", "-shortest")
        args += listOf("-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-movflags", "+faststart", output.absolutePath)

        ffmpeg(args) { t -> onProgress(if (total > 0) min(1.0, t / total) else 0.0) }
        onProgress(1.0)
    }
}
