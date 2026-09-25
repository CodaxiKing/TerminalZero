package com.terminalzero.app

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.text.DateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.roundToInt

private val Background = Color(0xFF111112)
private val Panel = Color(0xFF18181A)
private val CardColor = Color(0xFF1F1F22)
private val Border = Color(0xFF2E2E33)
private val Muted = Color(0xFF8D8D95)
private val Accent = Color(0xFFD4FF3F)
private val Danger = Color(0xFFFF6B6B)
private val Ok = Color(0xFF6BE38A)
private val Warning = Color(0xFFFFB347)

@Composable
fun TerminalZeroTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Accent,
            onPrimary = Color(0xFF111111),
            background = Background,
            onBackground = Color(0xFFF2F2F3),
            surface = Panel,
            onSurface = Color(0xFFF2F2F3),
            surfaceVariant = CardColor,
            onSurfaceVariant = Muted,
            outline = Border,
            secondaryContainer = CardColor,
            onSecondaryContainer = Accent,
        ),
        content = content,
    )
}

private fun fmt(seconds: Double): String {
    val rounded = (seconds * 10).roundToInt() / 10.0
    val text = if (rounded % 1.0 == 0.0) rounded.toInt().toString() else String.format(Locale("pt", "BR"), "%.1f", rounded)
    return "${text}s"
}

private fun Context.fileUri(file: File): Uri = FileProvider.getUriForFile(this, "$packageName.files", file)

private fun Context.openFile(file: File, mime: String) {
    try {
        startActivity(
            Intent(Intent.ACTION_VIEW).setDataAndType(fileUri(file), mime).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        )
    } catch (e: ActivityNotFoundException) {
        Toast.makeText(this, "Nenhum app para abrir esse arquivo.", Toast.LENGTH_SHORT).show()
    }
}

private fun Context.shareFile(file: File, mime: String) {
    val send = Intent(Intent.ACTION_SEND)
        .setType(mime)
        .putExtra(Intent.EXTRA_STREAM, fileUri(file))
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    startActivity(Intent.createChooser(send, "Compartilhar"))
}

// ---- Miniaturas ----

@Composable
private fun rememberThumbnail(key: Any?, load: (Context) -> Bitmap?): ImageBitmap? {
    val context = LocalContext.current
    val bitmap by produceState<ImageBitmap?>(null, key) {
        value = withContext(Dispatchers.IO) { runCatching { load(context)?.asImageBitmap() }.getOrNull() }
    }
    return bitmap
}

private fun videoFrame(file: File): Bitmap? {
    val retriever = MediaMetadataRetriever()
    return try {
        retriever.setDataSource(file.absolutePath)
        retriever.getFrameAtTime(300_000)
    } finally {
        retriever.release()
    }
}

private fun videoFrame(context: Context, uri: Uri): Bitmap? {
    val retriever = MediaMetadataRetriever()
    return try {
        retriever.setDataSource(context, uri)
        retriever.getFrameAtTime(300_000)
    } finally {
        retriever.release()
    }
}

private fun videoDuration(context: Context, uri: Uri): Double {
    val retriever = MediaMetadataRetriever()
    return try {
        retriever.setDataSource(context, uri)
        (retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L) / 1000.0
    } catch (e: Exception) {
        0.0
    } finally {
        retriever.release()
    }
}

private fun imageBitmap(context: Context, uri: Uri): Bitmap =
    ImageDecoder.decodeBitmap(ImageDecoder.createSource(context.contentResolver, uri)) { decoder, info, _ ->
        decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
        val largest = max(info.size.width, info.size.height)
        if (largest > 800) decoder.setTargetSampleSize(largest / 800)
    }

@Composable
private fun Thumb(bitmap: ImageBitmap?, label: String, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null) {
    Column(modifier) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(150.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color.Black)
                .let { if (onClick != null) it.clickable(onClick = onClick) else it },
            contentAlignment = Alignment.Center,
        ) {
            if (bitmap != null) {
                Image(bitmap, null, Modifier.fillMaxSize(), contentScale = ContentScale.Fit)
                if (onClick != null) Icon(Icons.Filled.PlayArrow, null, tint = Color.White.copy(alpha = 0.8f))
            }
        }
        Text(label, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
    }
}

// ---- App ----

@Composable
fun App(vm: AppViewModel) {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        vm.messages.collect { Toast.makeText(context, it, Toast.LENGTH_LONG).show() }
    }
    BackHandler(enabled = tab == 1) {
        if (vm.higgsfield.webView.canGoBack()) vm.higgsfield.webView.goBack() else tab = 0
    }
    BackHandler(enabled = tab != 1 && (tab == 2 || vm.job != null)) {
        if (tab == 2) tab = 0 else vm.closeJob()
    }

    Scaffold(
        containerColor = Background,
        bottomBar = {
            NavigationBar(containerColor = Panel) {
                listOf(
                    Triple("Projeto", Icons.Filled.Home, 0),
                    Triple("Navegador", Icons.Filled.Search, 1),
                    Triple("Conta", Icons.Filled.Person, 2),
                ).forEach { (label, icon, index) ->
                    NavigationBarItem(
                        selected = tab == index,
                        onClick = { tab = index },
                        icon = { Icon(icon, null) },
                        label = { Text(label) },
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            // O navegador fica sempre montado (a automação roda nele mesmo em outras abas).
            AndroidView(
                factory = { vm.higgsfield.webView.also { (it.parent as? ViewGroup)?.removeView(it) } },
                modifier = Modifier.fillMaxSize(),
            )
            if (tab != 1) {
                Surface(Modifier.fillMaxSize(), color = Background) {
                    when (tab) {
                        0 -> if (vm.job == null) HomeScreen(vm) else JobScreen(vm, vm.job!!)
                        2 -> AccountScreen(vm)
                    }
                }
            }
        }
    }
}

@Composable
private fun Section(title: String? = null, content: @Composable () -> Unit) {
    Surface(
        color = Panel,
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (title != null) Text(title, fontWeight = FontWeight.Bold, fontSize = 17.sp)
            content()
        }
    }
}

@Composable
private fun PrimaryButton(text: String, enabled: Boolean = true, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier,
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Color(0xFF111111)),
    ) { Text(text, fontWeight = FontWeight.SemiBold) }
}

@Composable
private fun SecondaryButton(text: String, enabled: Boolean = true, modifier: Modifier = Modifier, onClick: () -> Unit) {
    OutlinedButton(onClick = onClick, enabled = enabled, modifier = modifier, shape = RoundedCornerShape(10.dp)) {
        Text(text, color = Color(0xFFF2F2F3))
    }
}

// ---- Tela inicial: novo projeto + projetos salvos ----

@Composable
private fun PickCard(
    title: String,
    subtitle: String,
    video: Boolean,
    bitmap: ImageBitmap?,
    modifier: Modifier,
    onClick: () -> Unit,
) {
    Box(
        modifier
            .height(190.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(CardColor)
            .drawBehind {
                drawRoundRect(
                    color = Border,
                    style = Stroke(width = 1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 10f))),
                    cornerRadius = CornerRadius(14.dp.toPx()),
                )
            }
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (bitmap != null) {
            Image(bitmap, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        } else {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(12.dp)) {
                Box(
                    Modifier.size(36.dp).clip(CircleShape).background(Color(0xFF34343A)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(if (video) Icons.Filled.PlayArrow else Icons.Filled.Add, null, tint = Color(0xFFC9C9CF))
                }
                Spacer(Modifier.height(10.dp))
                Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(subtitle, color = Muted, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun HomeScreen(vm: AppViewModel) {
    val context = LocalContext.current
    var motion by remember { mutableStateOf<Uri?>(null) }
    var character by remember { mutableStateOf<Uri?>(null) }
    var seconds by rememberSaveable { mutableIntStateOf(5) }
    var duration by remember { mutableStateOf(0.0) }
    var confirmDelete by remember { mutableStateOf<Job?>(null) }

    val pickMotion = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) {
            motion = uri
            duration = videoDuration(context, uri)
        }
    }
    val pickCharacter = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) character = uri
    }
    val motionThumb = rememberThumbnail(motion) { ctx -> motion?.let { videoFrame(ctx, it) } }
    val characterThumb = rememberThumbnail(character) { ctx -> character?.let { imageBitmap(ctx, it) } }

    LaunchedEffect(Unit) { vm.refreshProjects() }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Column {
            Text("TerminalZero", fontWeight = FontWeight.Bold, fontSize = 24.sp)
            Text("Divide o vídeo em partes, gera cada parte com o seu personagem e junta tudo no final.", color = Muted, fontSize = 14.sp)
        }

        Section {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                PickCard("Vídeo de movimento", "Será dividido em partes iguais", true, motionThumb, Modifier.weight(1f)) {
                    pickMotion.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.VideoOnly))
                }
                PickCard("Seu personagem", "Rosto e corpo visíveis", false, characterThumb, Modifier.weight(1f)) {
                    pickCharacter.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                }
            }

            Text("Tamanho máximo de cada parte", fontSize = 14.sp)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SecondaryButton("−", enabled = seconds > AppViewModel.MIN_SECONDS) { seconds-- }
                Text("${seconds}s", fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.width(48.dp))
                SecondaryButton("+", enabled = seconds < AppViewModel.MAX_SECONDS) { seconds++ }
                Text("3 a 10s", color = Muted, fontSize = 13.sp)
            }
            if (duration > 0) {
                val count = max(1, ceil(duration / seconds - 1e-6).toInt())
                val length = duration / count
                Text(
                    "Vídeo de ${fmt(duration)} → $count ${if (count == 1) "parte" else "partes"} de ${fmt(length)}" +
                        if (length < AppViewModel.MIN_SECONDS) " · atenção: a Higgsfield pede no mínimo 3s por parte" else "",
                    color = if (length < AppViewModel.MIN_SECONDS) Warning else Muted,
                    fontSize = 14.sp,
                )
            }

            val splitting = vm.task != null
            PrimaryButton(
                text = when (vm.task?.kind) {
                    TaskKind.COPY -> "Copiando..."
                    TaskKind.SPLIT -> "Dividindo..."
                    else -> "Dividir vídeo"
                },
                enabled = motion != null && !splitting,
                modifier = Modifier.fillMaxWidth(),
            ) {
                motion?.let { vm.createJob(it, character, seconds) }
            }
        }

        if (vm.projects.isNotEmpty()) {
            Section("Projetos salvos") {
                vm.projects.forEach { p ->
                    Surface(color = CardColor, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date(p.createdAt)), fontWeight = FontWeight.Bold)
                                val done = p.segments.count { it.result != null }
                                Text(
                                    p.error ?: ("${fmt(p.duration)} · $done/${p.segments.size} partes prontas" +
                                        if (p.finalVideo != null) " · final pronto" else ""),
                                    color = if (p.error != null) Danger else Muted,
                                    fontSize = 13.sp,
                                )
                            }
                            TextButton(onClick = { vm.openJob(p.id) }) { Text("Abrir") }
                            TextButton(onClick = { confirmDelete = p }) { Text("Apagar", color = Muted) }
                        }
                    }
                }
            }
        }
    }

    confirmDelete?.let { p ->
        AlertDialog(
            onDismissRequest = { confirmDelete = null },
            title = { Text("Apagar projeto?") },
            text = { Text("O projeto e todos os vídeos dele serão apagados.") },
            confirmButton = { TextButton(onClick = { vm.deleteJob(p.id); confirmDelete = null }) { Text("Apagar") } },
            dismissButton = { TextButton(onClick = { confirmDelete = null }) { Text("Cancelar") } },
        )
    }
}

// ---- Projeto aberto ----

@Composable
private fun JobScreen(vm: AppViewModel, job: Job) {
    val context = LocalContext.current
    var keepAudio by rememberSaveable { mutableStateOf(true) }
    var crossfade by rememberSaveable { mutableStateOf(true) }
    val done = job.segments.count { it.result != null }
    val task = vm.task?.takeIf { it.jobId == job.id }
    val splitting = task?.kind == TaskKind.SPLIT || task?.kind == TaskKind.COPY
    val queueHere = vm.queueJobId == job.id

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = { vm.closeJob() }) { Text("← Projetos") }
                Text("Partes", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                Text(
                    if (splitting) "Dividindo o vídeo..."
                    else "Vídeo de ${fmt(job.duration)} em ${job.segments.size} partes de até ${job.segmentSeconds}s · " +
                        "$done/${job.segments.size} prontas" + if (job.character == null) " · sem personagem" else "",
                    color = Muted,
                    fontSize = 14.sp,
                )
                if (task != null) {
                    Text(
                        "${if (task.kind == TaskKind.MERGE) "Juntando" else "Dividindo"}... ${(task.progress * 100).roundToInt()}%",
                        color = Muted,
                        fontSize = 13.sp,
                    )
                    LinearProgressIndicator(progress = { task.progress }, modifier = Modifier.fillMaxWidth())
                }
                job.error?.let { Text(it, color = Danger, fontSize = 14.sp) }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (queueHere) {
                        SecondaryButton(
                            if (vm.stopRequested) "Parando após a parte atual..." else "Parar fila",
                            enabled = !vm.stopRequested,
                        ) { vm.stopQueue() }
                    } else {
                        PrimaryButton(
                            "Gerar todas",
                            enabled = !vm.busy && !splitting && job.segments.any { it.result == null },
                        ) { vm.generateAll() }
                    }
                }
                Text(
                    "Mantenha o app aberto durante a geração. Se aparecer captcha ou código, resolva na aba Navegador.",
                    color = Muted,
                    fontSize = 12.sp,
                )
            }
        }

        items(job.segments, key = { it.index }) { segment ->
            SegmentCard(vm, job, segment)
        }

        if (job.segments.isNotEmpty()) {
            item {
                Section {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(keepAudio, { keepAudio = it })
                        Text("Usar o áudio do vídeo original", fontSize = 14.sp)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(crossfade, { crossfade = it })
                        Text("Transição suave entre as partes (0,2s)", fontSize = 14.sp)
                    }
                    PrimaryButton(
                        if (task?.kind == TaskKind.MERGE) "Juntando..." else "Juntar vídeos",
                        enabled = done == job.segments.size && task == null && !vm.busy,
                        modifier = Modifier.fillMaxWidth(),
                    ) { vm.merge(keepAudio, crossfade) }

                    job.finalVideo?.let { name ->
                        val file = vm.file(job, name)
                        val thumb = rememberThumbnail("${file.path}:${file.lastModified()}") { videoFrame(file) }
                        Thumb(thumb, "Vídeo final", Modifier.fillMaxWidth()) { context.openFile(file, "video/mp4") }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            PrimaryButton("Salvar na galeria", modifier = Modifier.weight(1f)) { vm.saveToGallery() }
                            SecondaryButton("Compartilhar", modifier = Modifier.weight(1f)) { context.shareFile(file, "video/mp4") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SegmentCard(vm: AppViewModel, job: Job, segment: Segment) {
    val context = LocalContext.current
    val status = vm.status(job.id, segment.index)
    val originalFile = vm.file(job, "segments/${segment.file}")
    val resultFile = segment.result?.let { vm.file(job, "results/$it") }
    val originalThumb = rememberThumbnail(originalFile.path) { videoFrame(originalFile) }
    val resultThumb = rememberThumbnail("${resultFile?.path}:${resultFile?.lastModified()}") { resultFile?.let { videoFrame(it) } }
    val pickResult = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) vm.setManualResult(segment.index, uri)
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = CardColor),
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, if (status?.state == SegmentState.RUNNING) Accent else Border),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                "Parte ${segment.index + 1} · ${fmt(segment.start)} a ${fmt(segment.end)} (${fmt(segment.length)})",
                fontWeight = FontWeight.Bold,
            )
            if (segment.length < AppViewModel.MIN_SECONDS) {
                Text("Curta demais para a Higgsfield (mínimo 3s).", color = Warning, fontSize = 13.sp)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Thumb(originalThumb, "Original", Modifier.weight(1f)) { context.openFile(originalFile, "video/mp4") }
                Thumb(
                    resultThumb,
                    "Resultado",
                    Modifier.weight(1f),
                    onClick = resultFile?.let { f -> { context.openFile(f, "video/mp4") } },
                )
            }

            val (text, color) = when {
                status == null -> (if (segment.result != null) "Resultado pronto." else "Aguardando.") to Muted
                status.state == SegmentState.NO_CREDITS -> "${status.message} Recarregue e continue depois." to Warning
                status.state == SegmentState.ERROR -> status.message to Danger
                status.state == SegmentState.DONE -> status.message to Ok
                else -> status.message to Color(0xFFF2F2F3)
            }
            Text(text, color = color, fontSize = 14.sp)

            // Print e HTML salvos quando a geração falha.
            status?.debug?.takeIf { it.isNotEmpty() }?.let { files ->
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    files.forEach { f ->
                        if (f.extension == "png") {
                            TextButton(onClick = { context.openFile(f, "image/png") }) { Text("Ver print do erro") }
                        } else {
                            TextButton(onClick = { context.shareFile(f, "text/html") }) { Text("Enviar HTML") }
                        }
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PrimaryButton(
                    if (segment.result != null) "Gerar de novo" else "Gerar",
                    enabled = !vm.busy && vm.task?.jobId != job.id,
                    modifier = Modifier.weight(1f),
                ) { vm.generate(segment.index) }
                SecondaryButton("Enviar manual", enabled = !vm.busy, modifier = Modifier.weight(1f)) {
                    pickResult.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.VideoOnly))
                }
            }
        }
    }
}

// ---- Conta ----

@Composable
private fun AccountScreen(vm: AppViewModel) {
    var email by rememberSaveable { mutableStateOf(vm.higgsfield.email ?: "") }
    var password by remember { mutableStateOf(vm.higgsfield.password ?: "") }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Section("Conta Higgsfield") {
            Text(
                "Email e senha ficam só na memória do app (somem ao fechar). A sessão do navegador é reaproveitada " +
                    "enquanto for válida, então normalmente basta entrar uma vez.",
                color = Muted,
                fontSize = 14.sp,
            )
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Senha") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PrimaryButton("Salvar login", modifier = Modifier.weight(1f)) { vm.saveCredentials(email, password) }
                SecondaryButton("Entrar agora", enabled = !vm.busy, modifier = Modifier.weight(1f)) {
                    vm.saveCredentials(email, password)
                    vm.loginNow()
                }
            }
            Text(
                "Login com Google não funciona dentro de apps; use email e senha. Você também pode entrar " +
                    "manualmente pela aba Navegador.",
                color = Muted,
                fontSize = 13.sp,
            )
        }

        Section("Navegador") {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Modo desktop")
                    Text("Abre a Higgsfield com o layout do computador.", color = Muted, fontSize = 13.sp)
                }
                Switch(checked = vm.desktopMode, onCheckedChange = { vm.updateDesktopMode(it) })
            }
            SecondaryButton("Sair da conta (apagar sessão)", enabled = !vm.busy, modifier = Modifier.fillMaxWidth()) {
                vm.logout()
            }
        }
    }
}
