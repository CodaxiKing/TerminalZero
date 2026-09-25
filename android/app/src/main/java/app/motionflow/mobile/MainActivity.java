package app.motionflow.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.widget.*;
import androidx.core.content.FileProvider;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.effect.Presentation;
import androidx.media3.transformer.*;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Local Android workflow. No credentials or media are sent to a server. */
public class MainActivity extends Activity {
    private static final int VIDEO = 10, IMAGE = 11, RESULT = 12, SAVE = 13;
    private static final int BG = Color.rgb(16,19,18), PANEL = Color.rgb(24,30,25), TEXT = Color.rgb(234,240,230), MUTED = Color.rgb(158,174,150), ACCENT = Color.rgb(191,244,122);
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final ArrayList<String> accounts = new ArrayList<>();
    private final ArrayList<String> assigned = new ArrayList<>();
    private final ArrayList<Button> buttons = new ArrayList<>();
    private LinearLayout content;
    private TextView status;
    private File project, pendingSave, activeOutput;
    private long duration;
    private int resultIndex, width = 720, height = 1280;
    private boolean busy, hasAudio;
    private String note = "Selecione um vídeo e a imagem do seu personagem.";
    private Transformer transformer;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        if (saved != null) {
            resultIndex = saved.getInt("resultIndex");
            String pending = saved.getString("pendingSave");
            if (pending != null) pendingSave = new File(pending);
        }
        try {
            String id = getPreferences(0).getString("project", null);
            if (id == null) newProject(); else {
                project = new File(new File(getFilesDir(), "projects"), id);
                JSONObject obj = new JSONObject(Files.readString(new File(project, "state.json").toPath()));
                duration = obj.optLong("duration"); width = obj.optInt("width",720); height = obj.optInt("height",1280); hasAudio = obj.optBoolean("hasAudio");
                JSONArray aa = obj.optJSONArray("accounts"), pp = obj.optJSONArray("assigned");
                if (aa != null) for (int i=0;i<aa.length();i++) accounts.add(aa.getString(i));
                if (pp != null) for (int i=0;i<pp.length();i++) assigned.add(pp.getString(i));
                note = "Projeto recuperado. Cortes e resultados concluídos foram preservados.";
            }
        } catch (Exception e) { note = "Não foi possível recuperar o projeto: " + e.getMessage(); newProject(); }
        render();
    }
    @Override protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out); out.putInt("resultIndex", resultIndex);
        if (pendingSave != null) out.putString("pendingSave", pendingSave.getAbsolutePath());
    }
    private File file(String name) { return new File(project,name); }
    private void newProject() {
        project = new File(new File(getFilesDir(),"projects"), UUID.randomUUID().toString()); project.mkdirs();
        duration=0; assigned.clear(); persist();
        getPreferences(0).edit().putString("project",project.getName()).apply();
    }
    private void persist() {
        try {
            JSONObject obj = new JSONObject(); obj.put("duration",duration); obj.put("width",width); obj.put("height",height); obj.put("hasAudio",hasAudio);
            obj.put("accounts",new JSONArray(accounts)); obj.put("assigned",new JSONArray(assigned));
            File temp=file("state.tmp"); Files.writeString(temp.toPath(),obj.toString(),StandardCharsets.UTF_8);
            Files.move(temp.toPath(),file("state.json").toPath(),StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) { note="Falha ao salvar: "+e.getMessage(); }
    }
    private int dp(int v) { return Math.round(v*getResources().getDisplayMetrics().density); }
    private TextView text(LinearLayout parent,String value,int size,int color) {
        TextView t=new TextView(this); t.setText(value); t.setTextSize(size); t.setTextColor(color); t.setPadding(0,dp(6),0,dp(8)); parent.addView(t); return t;
    }
    private LinearLayout card(String title) {
        LinearLayout c=new LinearLayout(this); c.setOrientation(LinearLayout.VERTICAL); c.setPadding(dp(18),dp(14),dp(18),dp(16));
        GradientDrawable bg=new GradientDrawable(); bg.setColor(PANEL); bg.setCornerRadius(dp(16)); bg.setStroke(dp(1),Color.rgb(47,60,43)); c.setBackground(bg);
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2); lp.setMargins(0,dp(14),0,0); content.addView(c,lp); text(c,title,18,TEXT); return c;
    }
    private Button button(LinearLayout parent,String value,boolean enabled,Runnable action) {
        Button b=new Button(this); b.setText(value); b.setAllCaps(false); b.setTextSize(14); b.setMinHeight(dp(48)); b.setTextColor(BG); b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(ACCENT));
        b.setEnabled(enabled&&!busy); b.setAlpha(b.isEnabled()?1f:.4f); b.setOnClickListener(v->action.run()); parent.addView(b,new LinearLayout.LayoutParams(-1,-2)); buttons.add(b); return b;
    }
    private void render() {
        buttons.clear(); ScrollView scroll=new ScrollView(this); scroll.setFillViewport(true); scroll.setBackgroundColor(BG);
        content=new LinearLayout(this); content.setOrientation(LinearLayout.VERTICAL); content.setPadding(dp(20),dp(20),dp(20),dp(28)); scroll.addView(content); setContentView(scroll);
        scroll.setOnApplyWindowInsetsListener((v,insets)->{ v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom()); return insets; });
        text(content,"▰ motionflow",28,ACCENT); text(content,"ESTÚDIO ANDROID · NO SEU CELULAR",11,MUTED);
        text(content,"Um movimento.\nSeu personagem.",30,TEXT);
        status=text(content,note,14,ACCENT);
        LinearLayout source=card("01 / Material de origem");
        text(source,duration>0?String.format(Locale.US,"%.2fs → %d trechos de até 5s",duration/1000.0,SegmentPlan.create(duration).size()):"Vídeos de até 30 minutos. Os cortes são feitos neste aparelho.",13,MUTED);
        boolean canChange=assigned.isEmpty();
        button(source,duration>0?"Trocar vídeo":"Selecionar vídeo",canChange,()->pick(VIDEO,"video/*"));
        button(source,file("character").exists()?"Trocar personagem":"Selecionar personagem",canChange,()->pick(IMAGE,"image/*"));
        if(file("character").exists()) button(source,"Compartilhar personagem",true,()->share(file("character"),"image/*"));
        LinearLayout ac=card("02 / Contas e distribuição");
        text(ac,"Uma conta por trecho, na ordem abaixo. Aqui você organiza os e-mails; o login é feito diretamente no navegador.",13,MUTED);
        for(int i=0;i<accounts.size();i++) text(ac,(i+1)+". "+accounts.get(i),14,TEXT);
        button(ac,"Adicionar conta",canChange,this::addAccount);
        button(ac,"Preparar cortes de 5 segundos",duration>0&&file("character").exists()&&accounts.size()>=SegmentPlan.create(duration).size(),this::startSplit);
        LinearLayout external=card("Higgsfield Motion");
        text(external,"A geração automática ainda não está disponível. Salve os trechos e o personagem, gere no Higgsfield e importe cada resultado abaixo. O navegador usa a sessão atual: confira a conta antes de gerar.",13,MUTED);
        button(external,"Abrir Higgsfield no navegador",true,()->{try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://higgsfield.ai/ai/video/motion")));}catch(Exception e){fail(e);}});
        if(!assigned.isEmpty()) {
            var parts=SegmentPlan.create(duration);
            for(int i=0;i<parts.size();i++) {
                final int index=i; var part=parts.get(i);
                LinearLayout c=card(String.format(Locale.US,"Trecho %02d · %.2f–%.2fs",i+1,part.startMs()/1000.0,(part.startMs()+part.durationMs())/1000.0));
                text(c,assigned.get(i),13,MUTED);
                File cut=file("part-"+i+".mp4"), result=file("result-"+i+".mp4");
                button(c,"Salvar trecho em Downloads",cut.exists(),()->saveAs(cut,"video/mp4"));
                button(c,"Compartilhar trecho",cut.exists(),()->share(cut,"video/mp4"));
                text(c,result.exists()?"✓ Resultado importado":"Aguardando resultado do Higgsfield",12,MUTED);
                button(c,result.exists()?"Substituir resultado":"Importar resultado",cut.exists(),()->{resultIndex=index;pick(RESULT,"video/*");});
            }
            LinearLayout finish=card("03 / Vídeo final");
            text(finish,"Os resultados serão unidos na ordem dos trechos, com o áudio original. Mantenha o aplicativo aberto durante o processamento.",13,MUTED);
            boolean ready=true; for(int i=0;i<parts.size();i++) ready &= file("result-"+i+".mp4").exists();
            button(finish,"Unir resultados",ready,this::startMerge);
            button(finish,"Salvar vídeo final",file("final.mp4").exists(),()->saveAs(file("final.mp4"),"video/mp4"));
            button(finish,"Compartilhar vídeo final",file("final.mp4").exists(),()->share(file("final.mp4"),"video/mp4"));
        }
        button(content,"Novo projeto",true,()->new AlertDialog.Builder(this).setTitle("Iniciar outro projeto?").setMessage("Salve os arquivos que deseja manter acessíveis. A tela passará a mostrar o novo projeto.").setNegativeButton("Cancelar",null).setPositiveButton("Novo projeto",(d,w)->{newProject();note="Selecione o próximo vídeo.";render();}).show());
        text(content,"MotionFlow 0.1 · Processamento local\nNão armazena senhas. Desinstalar apaga os arquivos internos; exporte seus resultados antes.",11,MUTED);
    }
    private void addAccount() {
        EditText input=new EditText(this);input.setSingleLine(true);input.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);input.setHint("voce@exemplo.com");
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Adicionar conta").setView(input).setNegativeButton("Cancelar",null).setPositiveButton("Adicionar",null).create();
        dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
            String email=input.getText().toString().trim(); if(!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()){input.setError("E-mail inválido");return;}
            for(String existing:accounts)if(existing.equalsIgnoreCase(email)){input.setError("Conta já cadastrada");return;}
            accounts.add(email);persist();dialog.dismiss();render();
        })); dialog.show();
    }
    private void pick(int code,String type) {
        Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType(type).addCategory(Intent.CATEGORY_OPENABLE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION); startActivityForResult(intent,code);
    }
    private void saveAs(File source,String mime) {
        pendingSave=source; startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).setType(mime).addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,"motionflow-"+source.getName()),SAVE);
    }
    private void share(File source,String mime) {
        Uri uri=FileProvider.getUriForFile(this,getPackageName()+".files",source);
        Intent intent=new Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.setClipData(ClipData.newRawUri("MotionFlow",uri));startActivity(Intent.createChooser(intent,"Compartilhar arquivo"));
    }
    private void setBusy(String value) {
        busy=true; note=value; status.setText(value); for(Button b:buttons){b.setEnabled(false);b.setAlpha(.4f);}getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
    private void finish(String value) { busy=false;transformer=null;activeOutput=null;getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);note=value;persist();render(); }
    private void fail(Exception e) {
        if(activeOutput!=null)activeOutput.delete(); finish("Não foi possível concluir: "+e.getMessage());
    }
    private long metadata(File source) throws Exception {
        try(MediaMetadataRetriever m=new MediaMetadataRetriever()) { m.setDataSource(source.getAbsolutePath()); String value=m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION); if(value==null)throw new IOException("Vídeo sem duração válida."); return Long.parseLong(value); }
    }
    private void copy(InputStream in,OutputStream out) throws Exception {
        if(in==null||out==null)throw new IOException("Não foi possível abrir o arquivo.");byte[] buf=new byte[65536];long total=0;int n;while((n=in.read(buf))!=-1){total+=n;if(total>1024L*1024*1024)throw new IOException("Limite de 1 GB por arquivo.");out.write(buf,0,n);}
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);if(result!=RESULT_OK||data==null||data.getData()==null)return;
        Uri uri=data.getData();setBusy(request==SAVE?"Salvando arquivo…":"Importando arquivo…");
        io.execute(()->{
            File temp=file("import.tmp");
            try {
                if(request==SAVE){if(pendingSave==null)throw new IOException("Selecione novamente o arquivo para salvar.");try(InputStream in=new FileInputStream(pendingSave);OutputStream out=getContentResolver().openOutputStream(uri)){copy(in,out);}runOnUiThread(()->finish("Arquivo salvo no local escolhido."));return;}
                try(InputStream in=getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(temp)){copy(in,out);}
                if(request==VIDEO){
                    long length=metadata(temp);SegmentPlan.create(length);
                    int w,h;boolean sound;
                    try(MediaMetadataRetriever m=new MediaMetadataRetriever()){
                        m.setDataSource(temp.getAbsolutePath());w=Integer.parseInt(m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH));h=Integer.parseInt(m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT));
                        String rotate=m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION);if("90".equals(rotate)||"270".equals(rotate)){int old=w;w=h;h=old;}sound="yes".equals(m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO));
                    }
                    Files.move(temp.toPath(),file("source.mp4").toPath(),StandardCopyOption.REPLACE_EXISTING);
                    duration=length;width=w;height=h;hasAudio=sound;
                }else if(request==IMAGE){
                    android.graphics.BitmapFactory.Options opts=new android.graphics.BitmapFactory.Options();opts.inJustDecodeBounds=true;android.graphics.BitmapFactory.decodeFile(temp.getAbsolutePath(),opts);
                    if(opts.outWidth<=0)throw new IOException("Imagem não suportada. Use JPG, PNG ou WebP.");
                    Files.move(temp.toPath(),file("character").toPath(),StandardCopyOption.REPLACE_EXISTING);
                }else if(request==RESULT){
                    if(metadata(temp)+120<SegmentPlan.create(duration).get(resultIndex).durationMs())throw new IOException("Resultado menor que o trecho original.");
                    Files.move(temp.toPath(),file("result-"+resultIndex+".mp4").toPath(),StandardCopyOption.REPLACE_EXISTING);file("final.mp4").delete();
                }
                runOnUiThread(()->finish("Arquivo importado."));
            }catch(Exception e){temp.delete();runOnUiThread(()->{if(!isDestroyed())fail(e);});}
        });
    }
    private EditedMediaItem edited(File source,long start,long length,boolean removeAudio) {
        MediaItem m=new MediaItem.Builder().setUri(Uri.fromFile(source)).setClippingConfiguration(new MediaItem.ClippingConfiguration.Builder().setStartPositionMs(start).setEndPositionMs(start+length).build()).build();
        return new EditedMediaItem.Builder(m).setRemoveAudio(removeAudio).setFrameRate(30).build();
    }
    private void export(Composition composition,File destination,Runnable next) {
        activeOutput=new File(destination.getAbsolutePath()+".partial.mp4");activeOutput.delete();
        transformer=new Transformer.Builder(this).setVideoMimeType(MimeTypes.VIDEO_H264).setAudioMimeType(MimeTypes.AUDIO_AAC).addListener(new Transformer.Listener(){
            @Override public void onCompleted(Composition c,ExportResult r) {
                try {Files.move(activeOutput.toPath(),destination.toPath(),StandardCopyOption.REPLACE_EXISTING);activeOutput=null;transformer=null;next.run();}catch(Exception e){fail(e);}
            }
            @Override public void onError(Composition c,ExportResult r,ExportException e){fail(e);}
        }).build();
        try{transformer.start(composition,activeOutput.getAbsolutePath());}catch(Exception e){fail(e);}
    }
    private void startSplit() {
        if(assigned.isEmpty()){assigned.addAll(accounts.subList(0,SegmentPlan.create(duration).size()));persist();}
        setBusy("Preparando os cortes… Mantenha o app aberto.");splitNext(0);
    }
    private void splitNext(int index) {
        var parts=SegmentPlan.create(duration);if(index>=parts.size()){finish("Cortes prontos. Salve-os e gere seus vídeos no Higgsfield.");return;}
        if(file("part-"+index+".mp4").exists()){splitNext(index+1);return;}
        status.setText("Cortando trecho "+(index+1)+" de "+parts.size()+"… Mantenha o app aberto.");var p=parts.get(index);
        EditedMediaItem item=edited(file("source.mp4"),p.startMs(),p.durationMs(),false);
        export(new Composition.Builder(new EditedMediaItemSequence(List.of(item))).build(),file("part-"+index+".mp4"),()->splitNext(index+1));
    }
    private void startMerge() {
        setBusy("Unindo resultados… Mantenha o app aberto.");
        try {
            ArrayList<EditedMediaItem> items=new ArrayList<>();var parts=SegmentPlan.create(duration);
            // Limit output to 1080p for mobile encoders, preserve the source aspect ratio.
            float factor=Math.min(1f,1080f/Math.max(width,height));int w=Math.max(2,Math.round(width*factor/2)*2),h=Math.max(2,Math.round(height*factor/2)*2);
            for(int i=0;i<parts.size();i++)items.add(edited(file("result-"+i+".mp4"),0,parts.get(i).durationMs(),true).buildUpon().setEffects(new Effects(List.of(),List.of(Presentation.createForWidthAndHeight(w,h,Presentation.LAYOUT_SCALE_TO_FIT)))).build());
            ArrayList<EditedMediaItemSequence> sequences=new ArrayList<>();sequences.add(new EditedMediaItemSequence(items));
            if(hasAudio)sequences.add(new EditedMediaItemSequence(List.of(new EditedMediaItem.Builder(MediaItem.fromUri(Uri.fromFile(file("source.mp4")))).setRemoveVideo(true).build())));
            Composition c=new Composition.Builder(sequences).build();export(c,file("final.mp4"),()->finish("Vídeo final pronto para salvar e compartilhar."));
        }catch(Exception e){fail(e);}
    }
    @Override protected void onStop() {
        super.onStop();if(transformer!=null){transformer.cancel();if(activeOutput!=null)activeOutput.delete();finish("Processamento pausado ao sair do app. Toque em preparar ou unir novamente; os trechos concluídos foram mantidos.");}
    }
    @Override protected void onDestroy(){if(transformer!=null)transformer.cancel();io.shutdown();super.onDestroy();}
}
