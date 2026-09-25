package com.terminalzero.app

import org.json.JSONArray
import org.json.JSONObject
import java.io.File

data class Segment(
    val index: Int,
    val start: Double,
    val end: Double,
    val file: String,
    val result: String? = null,
) {
    val length get() = end - start
}

data class Job(
    val id: String,
    val createdAt: Long,
    val motion: String,
    val character: String?,
    val segmentSeconds: Int,
    val duration: Double = 0.0,
    val segments: List<Segment> = emptyList(),
    val finalVideo: String? = null,
    val error: String? = null,
)

private fun JSONObject.stringOrNull(key: String): String? = if (isNull(key)) null else optString(key)

private fun Segment.toJson() = JSONObject()
    .put("index", index)
    .put("start", start)
    .put("end", end)
    .put("file", file)
    .put("result", result ?: JSONObject.NULL)

private fun segmentFromJson(o: JSONObject) = Segment(
    index = o.getInt("index"),
    start = o.getDouble("start"),
    end = o.getDouble("end"),
    file = o.getString("file"),
    result = o.stringOrNull("result"),
)

private fun Job.toJson() = JSONObject()
    .put("id", id)
    .put("createdAt", createdAt)
    .put("motion", motion)
    .put("character", character ?: JSONObject.NULL)
    .put("segmentSeconds", segmentSeconds)
    .put("duration", duration)
    .put("segments", JSONArray(segments.map { it.toJson() }))
    .put("final", finalVideo ?: JSONObject.NULL)
    .put("error", error ?: JSONObject.NULL)

private fun jobFromJson(o: JSONObject): Job {
    val segs = o.optJSONArray("segments") ?: JSONArray()
    return Job(
        id = o.getString("id"),
        createdAt = o.getLong("createdAt"),
        motion = o.getString("motion"),
        character = o.stringOrNull("character"),
        segmentSeconds = o.optInt("segmentSeconds", 5),
        duration = o.optDouble("duration", 0.0),
        segments = (0 until segs.length()).map { segmentFromJson(segs.getJSONObject(it)) },
        finalVideo = o.stringOrNull("final"),
        error = o.stringOrNull("error"),
    )
}

/** Projetos salvos em files/jobs/<id>/ (vídeo original, partes, resultados, final, job.json). */
class JobStore(private val root: File) {
    fun dir(id: String) = File(root, id)

    fun file(job: Job, relative: String) = File(dir(job.id), relative)

    fun load(id: String): Job? = runCatching {
        jobFromJson(JSONObject(File(dir(id), "job.json").readText()))
    }.getOrNull()

    fun save(job: Job) {
        dir(job.id).mkdirs()
        File(dir(job.id), "job.json").writeText(job.toJson().toString(2))
    }

    fun list(): List<Job> =
        (root.listFiles()?.toList() ?: emptyList())
            .mapNotNull { load(it.name) }
            .sortedByDescending { it.createdAt }

    fun delete(id: String) {
        dir(id).deleteRecursively()
    }
}
