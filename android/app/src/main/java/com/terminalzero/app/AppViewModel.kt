package com.terminalzero.app

import android.app.Application
import android.content.ContentValues
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.util.UUID

enum class SegmentState { QUEUED, RUNNING, DONE, ERROR, NO_CREDITS }

data class SegmentStatus(val state: SegmentState, val message: String, val debug: List<File> = emptyList())

enum class TaskKind { COPY, SPLIT, MERGE }

data class Task(val jobId: String, val kind: TaskKind, val progress: Float)

class AppViewModel(app: Application) : AndroidViewModel(app) {
    companion object {
        const val MIN_SECONDS = 3
        const val MAX_SECONDS = 10
        const val CROSSFADE = 0.2
        private const val PREFS = "terminalzero"
    }

    private val store = JobStore(File(app.filesDir, "jobs"))
    private val prefs = app.getSharedPreferences(PREFS, 0)
    private val main = Handler(Looper.getMainLooper())

    val higgsfield = Higgsfield(app)

    var projects by mutableStateOf(emptyList<Job>())
        private set
    var job by mutableStateOf<Job?>(null)
        private set
    var task by mutableStateOf<Task?>(null)
        private set

    /** Status de cada parte, por "jobId:index" (só em memória). */
    val statuses = mutableStateMapOf<String, SegmentStatus>()

    /** Uma geração por vez (há um único navegador). */
    var busy by mutableStateOf(false)
        private set
    var queueJobId by mutableStateOf<String?>(null)
        private set
    var stopRequested by mutableStateOf(false)
        private set

    var desktopMode by mutableStateOf(prefs.getBoolean("desktop", true))
        private set

    private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 8)
    val messages: SharedFlow<String> = _messages

    init {
        higgsfield.setDesktopMode(desktopMode)
        refreshProjects()
    }

    private fun toast(text: String) {
        _messages.tryEmit(text)
    }

    fun status(jobId: String, index: Int) = statuses["$jobId:$index"]

    fun file(job: Job, relative: String) = store.file(job, relative)

    fun refreshProjects() {
        projects = store.list()
    }

    fun openJob(id: String) {
        job = store.load(id)
        if (job == null) toast("Projeto não encontrado.")
    }

    fun closeJob() {
        job = null
        refreshProjects()
    }

    private fun updateJob(id: String, change: (Job) -> Job): Job? {
        val current = store.load(id) ?: return null
        val updated = change(current)
        store.save(updated)
        if (job?.id == id) job = updated
        return updated
    }

    private fun setProgress(jobId: String, kind: TaskKind, progress: Double) {
        main.post { task = Task(jobId, kind, progress.toFloat().coerceIn(0f, 1f)) }
    }

    private suspend fun copyUri(uri: Uri, dest: File) = withContext(Dispatchers.IO) {
        dest.parentFile?.mkdirs()
        val input = getApplication<Application>().contentResolver.openInputStream(uri)
            ?: throw IllegalStateException("Não foi possível abrir o arquivo escolhido.")
        input.use { src -> dest.outputStream().use { src.copyTo(it) } }
    }

    private fun extensionOf(uri: Uri, fallback: String): String =
        when (getApplication<Application>().contentResolver.getType(uri)) {
            "video/mp4" -> "mp4"
            "video/quicktime" -> "mov"
            "video/webm" -> "webm"
            "image/png" -> "png"
            "image/webp" -> "webp"
            "image/jpeg" -> "jpg"
            else -> fallback
        }

    // ---- Projetos ----

    fun createJob(motion: Uri, character: Uri?, seconds: Int) {
        if (task != null) return toast("Aguarde o processamento atual terminar.")
        val id = UUID.randomUUID().toString()
        viewModelScope.launch {
            try {
                task = Task(id, TaskKind.COPY, 0f)
                val motionName = "motion.${extensionOf(motion, "mp4")}"
                copyUri(motion, File(store.dir(id), motionName))
                val characterName = character?.let { "character.${extensionOf(it, "jpg")}" }
                if (character != null && characterName != null) copyUri(character, File(store.dir(id), characterName))

                var created = Job(id, System.currentTimeMillis(), motionName, characterName, seconds)
                store.save(created)
                job = created

                task = Task(id, TaskKind.SPLIT, 0f)
                val (duration, segments) = Video.split(
                    File(store.dir(id), motionName), File(store.dir(id), "segments"), seconds,
                ) { setProgress(id, TaskKind.SPLIT, it) }
                created = created.copy(duration = duration, segments = segments)
                store.save(created)
                job = created
                if (characterName == null) toast("Sem personagem: adicione uma imagem se for gerar na Higgsfield.")
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (store.load(id) != null) updateJob(id) { it.copy(error = "Não foi possível dividir o vídeo.") }
                else store.delete(id)
                toast("Não foi possível dividir o vídeo: ${e.message?.take(200)}")
            } finally {
                main.post { task = null }
                refreshProjects()
            }
        }
    }

    fun deleteJob(id: String) {
        val running = task?.jobId == id || queueJobId == id ||
            statuses.any { (key, s) -> key.startsWith("$id:") && s.state == SegmentState.RUNNING }
        if (running) return toast("Esse projeto está em processamento. Aguarde terminar.")
        store.delete(id)
        statuses.keys.filter { it.startsWith("$id:") }.forEach { statuses.remove(it) }
        if (job?.id == id) job = null
        refreshProjects()
    }

    // ---- Higgsfield ----

    fun saveCredentials(email: String, password: String) {
        higgsfield.email = email.trim()
        higgsfield.password = password
        toast(if (higgsfield.hasCredentials) "Login salvo (só na memória do app)." else "Informe email e senha.")
    }

    fun updateDesktopMode(enabled: Boolean) {
        desktopMode = enabled
        prefs.edit().putBoolean("desktop", enabled).apply()
        higgsfield.setDesktopMode(enabled)
        higgsfield.webView.reload()
    }

    fun logout() {
        higgsfield.clearSession()
        toast("Sessão da Higgsfield apagada.")
    }

    private fun exclusive(work: suspend () -> Unit) {
        if (busy) return toast("Já existe uma geração em andamento. Aguarde terminar.")
        busy = true
        viewModelScope.launch {
            try {
                work()
            } finally {
                busy = false
                queueJobId = null
                stopRequested = false
            }
        }
    }

    fun loginNow() = exclusive {
        try {
            higgsfield.ensureLoggedIn { toast(it) }
            toast("Conectado à Higgsfield.")
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            toast(e.message ?: "Não foi possível fazer login.")
        }
    }

    /** Gera uma parte e salva o resultado no slot dela. Lança o erro para a fila decidir. */
    private suspend fun generateSegment(jobId: String, index: Int) {
        val current = store.load(jobId) ?: throw IllegalStateException("Projeto não encontrado.")
        val segment = current.segments[index]
        val key = "$jobId:$index"
        val name = "resultado_%02d.mp4".format(index + 1)
        val log: (String) -> Unit = { message -> main.post { statuses[key] = SegmentStatus(SegmentState.RUNNING, message) } }

        statuses[key] = SegmentStatus(SegmentState.RUNNING, "Iniciando...")
        try {
            higgsfield.generate(
                motionFile = store.file(current, "segments/${segment.file}"),
                characterFile = current.character?.let { store.file(current, it) },
                outFile = store.file(current, "results/$name"),
                debugDir = store.file(current, "debug"),
                debugName = "parte_%02d".format(index + 1),
                log = log,
            )
            updateJob(jobId) { j ->
                j.copy(segments = j.segments.map { if (it.index == index) it.copy(result = name) else it }, finalVideo = null)
            }
            main.post { statuses[key] = SegmentStatus(SegmentState.DONE, "Concluído.") }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            val auto = e as? AutomationException
            val state = if (auto?.noCredits == true) SegmentState.NO_CREDITS else SegmentState.ERROR
            main.post { statuses[key] = SegmentStatus(state, e.message ?: "Erro.", auto?.debug ?: emptyList()) }
            throw e
        }
    }

    fun generate(index: Int) {
        val jobId = job?.id ?: return
        exclusive { runCatching { generateSegment(jobId, index) } }
    }

    /** Gera, em ordem, as partes sem resultado. Para no primeiro erro (inclusive falta de créditos). */
    fun generateAll() {
        val current = job ?: return
        val pending = current.segments.filter { it.result == null }.map { it.index }
        if (pending.isEmpty()) return toast("Todas as partes já têm resultado.")
        exclusive {
            queueJobId = current.id
            pending.forEach { statuses["${current.id}:$it"] = SegmentStatus(SegmentState.QUEUED, "Na fila.") }
            try {
                for (index in pending) {
                    if (stopRequested) break
                    generateSegment(current.id, index)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // O status da parte já mostra o erro; as seguintes voltam a aguardar.
            } finally {
                main.post {
                    pending.forEach { i ->
                        val key = "${current.id}:$i"
                        if (statuses[key]?.state == SegmentState.QUEUED) statuses.remove(key)
                    }
                }
            }
        }
    }

    fun stopQueue() {
        if (queueJobId != null) stopRequested = true
    }

    // ---- Resultados e junção ----

    fun setManualResult(index: Int, uri: Uri) {
        val current = job ?: return
        viewModelScope.launch {
            try {
                val ext = extensionOf(uri, "mp4")
                val name = "resultado_%02d.$ext".format(index + 1)
                copyUri(uri, store.file(current, "results/$name"))
                statuses.remove("${current.id}:$index")
                updateJob(current.id) { j ->
                    j.copy(segments = j.segments.map { if (it.index == index) it.copy(result = name) else it }, finalVideo = null)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                toast("Não foi possível usar esse vídeo: ${e.message}")
            }
        }
    }

    fun merge(keepAudio: Boolean, crossfade: Boolean) {
        val current = job ?: return
        if (task != null) return toast("Aguarde o processamento atual terminar.")
        val missing = current.segments.filter { it.result == null }.map { it.index + 1 }
        if (missing.isNotEmpty()) return toast("Faltam os resultados das partes: ${missing.joinToString(", ")}.")

        task = Task(current.id, TaskKind.MERGE, 0f)
        updateJob(current.id) { it.copy(finalVideo = null, error = null) }
        viewModelScope.launch {
            try {
                Video.concat(
                    inputs = current.segments.map { store.file(current, "results/${it.result}") },
                    output = store.file(current, "final.mp4"),
                    audioFrom = if (keepAudio) store.file(current, current.motion) else null,
                    crossfade = if (crossfade) CROSSFADE else 0.0,
                ) { setProgress(current.id, TaskKind.MERGE, it) }
                updateJob(current.id) { it.copy(finalVideo = "final.mp4") }
                toast("Vídeo final pronto.")
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                updateJob(current.id) { it.copy(error = "Não foi possível juntar os vídeos.") }
            } finally {
                main.post { task = null }
            }
        }
    }

    /** Copia o vídeo final para a galeria (Filmes/TerminalZero). */
    fun saveToGallery() {
        val current = job ?: return
        val source = current.finalVideo?.let { store.file(current, it) } ?: return
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    val resolver = getApplication<Application>().contentResolver
                    val values = ContentValues().apply {
                        put(MediaStore.Video.Media.DISPLAY_NAME, "TerminalZero_${System.currentTimeMillis()}.mp4")
                        put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
                        put(MediaStore.Video.Media.RELATIVE_PATH, "Movies/TerminalZero")
                        put(MediaStore.Video.Media.IS_PENDING, 1)
                    }
                    val collection = MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                    val uri = resolver.insert(collection, values) ?: throw IllegalStateException("Galeria indisponível.")
                    resolver.openOutputStream(uri)?.use { out -> source.inputStream().use { it.copyTo(out) } }
                    values.clear()
                    values.put(MediaStore.Video.Media.IS_PENDING, 0)
                    resolver.update(uri, values, null, null)
                }
                toast("Salvo na galeria em Filmes/TerminalZero.")
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                toast("Não foi possível salvar: ${e.message}")
            }
        }
    }

    override fun onCleared() {
        higgsfield.destroy()
    }
}
