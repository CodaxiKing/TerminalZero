package com.terminalzero.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.webkit.CookieManager
import android.webkit.ServiceWorkerClient
import android.webkit.ServiceWorkerController
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener
import java.io.File
import java.io.FileInputStream
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import kotlin.coroutines.resume

class AutomationException(
    message: String,
    val noCredits: Boolean = false,
    val debug: List<File> = emptyList(),
) : Exception(message)

/**
 * Automação da página de Motion da Higgsfield num WebView, usando UMA conta.
 *
 * Os arquivos são entregues à página por um endereço interno no mesmo domínio
 * (/__terminalzero/...), interceptado pelo app, e colocados nos campos de upload via
 * DataTransfer. Os seletores foram escritos sem acesso ao site logado: se a Higgsfield mudar a
 * página, ajuste as constantes abaixo. Quando uma geração falha, um print e o HTML da página são
 * salvos na pasta debug do projeto.
 */
@SuppressLint("SetJavaScriptEnabled")
class Higgsfield(context: Context) {
    companion object {
        const val MOTION_URL = "https://higgsfield.ai/ai/video/motion"
        private const val SERVE_PREFIX = "/__terminalzero/"
        private const val GENERATION_TIMEOUT_MS = 20 * 60_000L

        private const val SIGN_IN = "/^(sign in|log in|login|entrar)$/i"
        private const val GENERATE = "/^(generate|gerar|create)\\b/i"
        private const val NO_CREDITS =
            "/(not enough credits|insufficient credits|out of credits|no credits left|you have run out of credits|créditos insuficientes|sem créditos)/i"
        private const val EMAIL_SELECTOR =
            "input[type=email], input[name=email], input[autocomplete=email], input[name=identifier]"

        // Funções auxiliares injetadas em cada chamada de JavaScript.
        private val JS_LIB = """
            function tzVisible(el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
            function tzFind(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)).filter(tzVisible)[0] || null; }
            function tzButtons(re) {
              return Array.prototype.slice.call(document.querySelectorAll('button, a, [role=button]'))
                .filter(function (el) { return tzVisible(el) && re.test((el.innerText || el.textContent || '').trim()); });
            }
            function tzSetValue(input, value) {
              var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
              setter.call(input, value);
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            function tzSubmit(input) {
              var form = input.form || input.closest('form');
              if (form) {
                var btn = form.querySelector('button[type=submit], input[type=submit]');
                if (btn) { btn.click(); return; }
                if (form.requestSubmit) { form.requestSubmit(); return; }
              }
              ['keydown', 'keypress', 'keyup'].forEach(function (t) {
                input.dispatchEvent(new KeyboardEvent(t, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
              });
            }
            function tzVideos() {
              return Array.prototype.slice.call(document.querySelectorAll('video'))
                .map(function (el) {
                  var source = el.querySelector('source');
                  var src = el.currentSrc || el.src || (source && source.src) || '';
                  var r = el.getBoundingClientRect();
                  return { src: src, top: r.top + window.scrollY, left: r.left + window.scrollX, visible: r.width > 0 };
                })
                .filter(function (v) { return v.visible && /^https?:/.test(v.src); })
                .sort(function (a, b) { return a.top - b.top || a.left - b.left; })
                .map(function (v) { return v.src; });
            }
        """.trimIndent()
    }

    val webView: WebView = WebView(context)

    var email: String? = null
    var password: String? = null
    val hasCredentials get() = !email.isNullOrBlank() && !password.isNullOrBlank()

    /** Chamado quando a página pede um arquivo manualmente (o app abre o seletor do Android). */
    var fileChooser: ((ValueCallback<Array<Uri>>, Intent) -> Unit)? = null

    private val served = ConcurrentHashMap<String, File>()
    @Volatile private var pageLoaded = CompletableDeferred<Unit>()
    private val defaultUserAgent: String

    init {
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            useWideViewPort = true
            loadWithOverviewMode = true
            builtInZoomControls = true
            displayZoomControls = false
        }
        defaultUserAgent = webView.settings.userAgentString
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                serve(request.url)

            override fun onPageFinished(view: WebView, url: String) {
                pageLoaded.complete(Unit)
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams,
            ): Boolean {
                val handler = fileChooser ?: return false
                handler(callback, params.createIntent())
                return true
            }
        }
        // Service workers do site também podem buscar os arquivos internos.
        ServiceWorkerController.getInstance().setServiceWorkerClient(object : ServiceWorkerClient() {
            override fun shouldInterceptRequest(request: WebResourceRequest): WebResourceResponse? = serve(request.url)
        })
        webView.loadUrl(MOTION_URL)
    }

    /** Modo desktop: a Higgsfield mostra o mesmo layout do computador (dá para dar zoom). */
    fun setDesktopMode(enabled: Boolean) {
        val chrome = Regex("Chrome/([\\d.]+)").find(defaultUserAgent)?.groupValues?.get(1) ?: "130.0.0.0"
        webView.settings.userAgentString = if (enabled) {
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/$chrome Safari/537.36"
        } else {
            defaultUserAgent
        }
    }

    fun clearSession() {
        CookieManager.getInstance().removeAllCookies(null)
        webView.clearCache(true)
        webView.loadUrl(MOTION_URL)
    }

    private fun serve(url: Uri): WebResourceResponse? {
        val path = url.path ?: return null
        if (!path.startsWith(SERVE_PREFIX)) return null
        val file = served[path.removePrefix(SERVE_PREFIX)] ?: return null
        val mime = when (file.extension.lowercase()) {
            "png" -> "image/png"
            "webp" -> "image/webp"
            "jpg", "jpeg" -> "image/jpeg"
            else -> "video/mp4"
        }
        return WebResourceResponse(
            mime, null, 200, "OK",
            mapOf("Access-Control-Allow-Origin" to "*", "Cache-Control" to "no-store"),
            FileInputStream(file),
        )
    }

    // ---- JavaScript ----

    private suspend fun evalRaw(js: String): String = withContext(Dispatchers.Main) {
        suspendCancellableCoroutine { cont -> webView.evaluateJavascript(js) { cont.resume(it ?: "null") } }
    }

    /** Executa o corpo de uma função JS e devolve o valor retornado (convertido de JSON). */
    private suspend fun js(body: String): Any? {
        val raw = evalRaw(
            "(function(){\n$JS_LIB\ntry { return JSON.stringify((function(){\n$body\n})()); }" +
                " catch (e) { return JSON.stringify({ __error: String(e && e.message || e) }); } })()"
        )
        val text = JSONTokener(raw).nextValue() as? String ?: return null
        val value = if (text == "undefined") null else JSONTokener(text).nextValue()
        if (value is JSONObject && value.has("__error")) throw AutomationException(value.getString("__error"))
        return value
    }

    /** Executa um corpo JS assíncrono (pode usar await) e espera o resultado. */
    private suspend fun jsAsync(body: String, timeoutMs: Long = 120_000): Any? {
        val id = "r" + System.nanoTime()
        js(
            """
            window.__tz = window.__tz || {};
            window.__tz['$id'] = { pending: true };
            (async function () {
            $body
            })().then(
              function (v) { window.__tz['$id'] = { value: v === undefined ? null : v }; },
              function (e) { window.__tz['$id'] = { error: String(e && e.message || e) }; }
            );
            return true;
            """.trimIndent()
        )
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            delay(300)
            val state = js("return (window.__tz && window.__tz['$id']) || { pending: true };") as? JSONObject ?: continue
            if (state.optBoolean("pending")) continue
            js("delete window.__tz['$id']; return true;")
            if (state.has("error")) throw AutomationException(state.getString("error"))
            return state.opt("value")
        }
        throw AutomationException("A página não respondeu a tempo.")
    }

    private suspend fun waitFor(timeoutMs: Long, condition: suspend () -> Boolean): Boolean {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            if (condition()) return true
            delay(1000)
        }
        return false
    }

    // ---- Etapas ----

    private suspend fun openMotionPage() {
        withContext(Dispatchers.Main) {
            pageLoaded = CompletableDeferred()
            webView.loadUrl(MOTION_URL)
        }
        withTimeoutOrNull(60_000) { pageLoaded.await() }
        delay(3000)
    }

    private suspend fun isLoggedIn() = js("return tzButtons($SIGN_IN).length === 0;") == true

    private suspend fun currentPath(): String =
        withContext(Dispatchers.Main) { Uri.parse(webView.url ?: "").path ?: "" }

    suspend fun ensureLoggedIn(log: (String) -> Unit) {
        openMotionPage()
        if (isLoggedIn()) return

        if (!hasCredentials) {
            throw AutomationException("Sessão expirada. Faça login na aba Navegador ou salve email e senha na aba Conta.")
        }
        log("Fazendo login...")
        js("var b = tzButtons($SIGN_IN)[0]; if (b) b.click(); return !!b;")

        if (!waitFor(30_000) { js("return !!tzFind('$EMAIL_SELECTOR');") == true }) {
            throw AutomationException("Campo de email do login não encontrado.")
        }
        js("tzSetValue(tzFind('$EMAIL_SELECTOR'), ${JSONObject.quote(email)}); return true;")

        if (js("return !!tzFind('input[type=password]');") != true) {
            // Alguns logins pedem o email primeiro e a senha numa segunda etapa.
            js("tzSubmit(tzFind('$EMAIL_SELECTOR')); return true;")
            if (!waitFor(30_000) { js("return !!tzFind('input[type=password]');") == true }) {
                throw AutomationException("Campo de senha do login não encontrado.")
            }
        }
        js(
            "var p = tzFind('input[type=password]'); tzSetValue(p, ${JSONObject.quote(password)});" +
                " setTimeout(function () { tzSubmit(p); }, 300); return true;"
        )

        // Se aparecer captcha ou código por email, resolva na aba Navegador.
        log("Aguardando o login terminar (resolva captcha/código na aba Navegador, se aparecer)...")
        val motionPath = Uri.parse(MOTION_URL).path ?: ""
        val ok = waitFor(3 * 60_000) {
            delay(1000)
            if (!currentPath().startsWith(motionPath)) {
                // Depois do login o site pode ir para outra página; volta para o Motion.
                if (js("return tzButtons($SIGN_IN).length === 0 && !tzFind('input[type=password]');") == true) {
                    openMotionPage()
                }
                false
            } else {
                isLoggedIn()
            }
        }
        if (!ok) throw AutomationException("Não foi possível confirmar o login.")
    }

    private suspend fun checkCredits() {
        if (js("return $NO_CREDITS.test(document.body ? document.body.innerText : '');") == true) {
            throw AutomationException("Sem créditos na conta Higgsfield.", noCredits = true)
        }
    }

    /** Coloca o vídeo e o personagem nos campos de upload da página. */
    private suspend fun fillInputs(motionFile: File, characterFile: File?) {
        if (!waitFor(30_000) { (js("return document.querySelectorAll('input[type=file]').length;") as? Int ?: 0) > 0 }) {
            throw AutomationException("Campos de upload não encontrados na página.")
        }
        val stamp = System.nanoTime()
        val motionName = "motion_$stamp.mp4"
        served[motionName] = motionFile
        val characterName = characterFile?.let { "character_$stamp.${it.extension}" }
        if (characterFile != null && characterName != null) served[characterName] = characterFile
        val characterType = when (characterFile?.extension?.lowercase()) {
            "png" -> "image/png"
            "webp" -> "image/webp"
            else -> "image/jpeg"
        }

        try {
            jsAsync(
                """
                var inputs = Array.prototype.slice.call(document.querySelectorAll('input[type=file]'));
                var motionInput = null, characterInput = null;
                inputs.forEach(function (i) {
                  var a = (i.getAttribute('accept') || '').toLowerCase();
                  if (!motionInput && /video|mp4|mov/.test(a)) motionInput = i;
                  else if (!characterInput && /image|png|jpe?g|webp/.test(a)) characterInput = i;
                });
                // Sem "accept": segue a ordem da tela (movimento primeiro, personagem depois).
                motionInput = motionInput || inputs[0];
                if (!characterInput) characterInput = inputs.filter(function (i) { return i !== motionInput; })[0] || null;

                async function put(input, url, name, type) {
                  var r = await fetch(url);
                  if (!r.ok) throw new Error('Falha ao carregar ' + name);
                  var blob = await r.blob();
                  var dt = new DataTransfer();
                  dt.items.add(new File([blob], name, { type: type }));
                  input.files = dt.files;
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                }

                await put(motionInput, '$SERVE_PREFIX$motionName', 'motion.mp4', 'video/mp4');
                var characterUrl = ${if (characterName != null) JSONObject.quote(SERVE_PREFIX + characterName) else "null"};
                if (characterUrl) {
                  if (!characterInput) throw new Error('Campo do personagem não encontrado na página.');
                  await put(characterInput, characterUrl, 'character.${characterFile?.extension ?: "jpg"}', '$characterType');
                }
                return true;
                """.trimIndent()
            )
        } finally {
            served.remove(motionName)
            if (characterName != null) served.remove(characterName)
        }
    }

    private suspend fun generateButtonState(): String =
        js(
            "var b = tzButtons($GENERATE); b = b[b.length - 1]; if (!b) return 'missing';" +
                " return (b.disabled || b.getAttribute('aria-disabled') === 'true') ? 'disabled' : 'enabled';"
        ) as? String ?: "missing"

    private suspend fun videosByRecency(): List<String> {
        val arr = js("return tzVideos();") as? JSONArray ?: return emptyList()
        return (0 until arr.length()).map { arr.getString(it) }
    }

    private suspend fun download(url: String): ByteArray {
        val (cookie, agent) = withContext(Dispatchers.Main) {
            CookieManager.getInstance().getCookie(url) to webView.settings.userAgentString
        }
        return withContext(Dispatchers.IO) {
            val conn = URL(url).openConnection() as HttpURLConnection
            try {
                if (cookie != null) conn.setRequestProperty("Cookie", cookie)
                conn.setRequestProperty("User-Agent", agent)
                conn.setRequestProperty("Referer", MOTION_URL)
                conn.connectTimeout = 30_000
                conn.readTimeout = 120_000
                if (conn.responseCode !in 200..299) {
                    throw AutomationException("Falha ao baixar o vídeo (${conn.responseCode}).")
                }
                conn.inputStream.use { it.readBytes() }
            } finally {
                conn.disconnect()
            }
        }
    }

    /** Salva um print da tela do navegador e o HTML da página, para ajustar os seletores. */
    private suspend fun saveDebug(dir: File, name: String): List<File> {
        val files = mutableListOf<File>()
        runCatching {
            dir.mkdirs()
            val stamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            val png = File(dir, "${name}_$stamp.png")
            withContext(Dispatchers.Main) {
                if (webView.width > 0 && webView.height > 0) {
                    val bitmap = Bitmap.createBitmap(webView.width, webView.height, Bitmap.Config.ARGB_8888)
                    webView.draw(Canvas(bitmap))
                    png.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
                    files += png
                }
            }
            val html = js("return document.documentElement.outerHTML;") as? String
            if (html != null) {
                val file = File(dir, "${name}_$stamp.html")
                file.writeText(html)
                files += file
            }
        }
        return files
    }

    /** Gera uma parte: envia os arquivos, clica em gerar, espera o card mais recente e baixa. */
    suspend fun generate(
        motionFile: File,
        characterFile: File?,
        outFile: File,
        debugDir: File,
        debugName: String,
        log: (String) -> Unit,
    ) {
        try {
            ensureLoggedIn(log)
            checkCredits()

            log("Enviando arquivos...")
            fillInputs(motionFile, characterFile)

            log("Aguardando o upload terminar...")
            if (!waitFor(60_000) { generateButtonState() != "missing" }) {
                throw AutomationException("Botão de gerar não encontrado.")
            }
            val enabled = waitFor(5 * 60_000) {
                checkCredits()
                generateButtonState() == "enabled"
            }
            if (!enabled) {
                checkCredits()
                throw AutomationException("O botão de gerar não ficou disponível.")
            }

            // Tudo que já está na tela (histórico e prévias do upload) não é o resultado.
            val seen = videosByRecency().toMutableSet()
            val inputSize = motionFile.length()

            js("var b = tzButtons($GENERATE); b = b[b.length - 1]; b.click(); return true;")
            log("Gerando na Higgsfield (pode levar alguns minutos)...")
            delay(3000)
            checkCredits()

            val deadline = System.currentTimeMillis() + GENERATION_TIMEOUT_MS
            var candidate: String? = null
            while (System.currentTimeMillis() < deadline) {
                delay(5000)
                checkCredits()
                val newest = videosByRecency().firstOrNull { it !in seen } ?: continue
                // Só aceita quando o mesmo vídeo aparece em duas verificações seguidas.
                if (newest != candidate) {
                    candidate = newest
                    continue
                }
                log("Baixando resultado...")
                val bytes = download(newest)
                if (bytes.size.toLong() == inputSize) {
                    // É o próprio vídeo enviado sendo exibido no card; continua esperando.
                    seen += newest
                    candidate = null
                    continue
                }
                withContext(Dispatchers.IO) {
                    outFile.parentFile?.mkdirs()
                    outFile.writeBytes(bytes)
                }
                return
            }
            throw AutomationException("Tempo esgotado esperando o vídeo gerado.")
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            val debug = saveDebug(debugDir, debugName)
            throw AutomationException(
                e.message ?: "Erro na automação.",
                noCredits = e is AutomationException && e.noCredits,
                debug = debug,
            )
        }
    }

    fun destroy() {
        webView.destroy()
    }
}
