package com.terminalzero.app

import android.net.Uri
import android.os.Bundle
import android.view.WindowManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.runtime.LaunchedEffect

class MainActivity : ComponentActivity() {
    private val vm: AppViewModel by viewModels()

    private var pendingChooser: ValueCallback<Array<Uri>>? = null

    // Seletor de arquivos quando você usa a Higgsfield manualmente na aba Navegador.
    private val chooser = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        pendingChooser?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data))
        pendingChooser = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        vm.higgsfield.fileChooser = { callback, intent ->
            pendingChooser?.onReceiveValue(null)
            pendingChooser = callback
            runCatching { chooser.launch(intent) }.onFailure {
                callback.onReceiveValue(null)
                pendingChooser = null
            }
        }
        setContent {
            // Tela ligada enquanto divide, gera ou junta.
            val working = vm.busy || vm.task != null
            LaunchedEffect(working) {
                if (working) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
            TerminalZeroTheme { App(vm) }
        }
    }

    override fun onDestroy() {
        if (!isChangingConfigurations) vm.higgsfield.fileChooser = null
        super.onDestroy()
    }
}
