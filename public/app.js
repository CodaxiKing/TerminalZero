const $ = (sel) => document.querySelector(sel);

const MIN_SECONDS = 3;
const MAX_SECONDS = 10;
const CROSSFADE = 0.2;

const state = { motion: null, motionDuration: 0, character: null, job: null, poll: null, rendered: "" };

function toast(message, isError = false) {
  const el = $("#toast");
  el.textContent = message;
  el.className = isError ? "error" : "";
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.hidden = true), 5000);
}

async function api(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

const postJson = (url, body = {}) =>
  api(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const fileUrl = (name) => `/files/${state.job.id}/${name}`;
const fmt = (s) => `${(Math.round(s * 10) / 10).toString().replace(".", ",")}s`;

// Mesma regra do servidor: menor número de partes iguais, cada uma com no máximo `max`.
function plan(duration, max) {
  const count = Math.max(1, Math.ceil(duration / max - 1e-6));
  return { count, length: duration / count };
}

// ---- Upload do vídeo e do personagem ----

function pickFile(inputId, cardId, key, tag) {
  $(inputId).addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state[key] = file;
    const card = $(cardId);
    const preview = card.querySelector(tag);
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    if (tag === "video") {
      preview.onloadedmetadata = () => {
        state.motionDuration = preview.duration;
        renderPlan();
      };
      preview.play().catch(() => {});
    }
    card.classList.add("filled");
    $("#split").disabled = !state.motion;
  });
}
pickFile("#motion", "#motion-card", "motion", "video");
pickFile("#character", "#character-card", "character", "img");

function segmentSeconds() {
  const value = Number($("#segment-seconds").value);
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(value) || 5));
}

function renderPlan() {
  const el = $("#plan");
  if (!state.motionDuration) return (el.textContent = "");
  const { count, length } = plan(state.motionDuration, segmentSeconds());
  el.textContent = `Vídeo de ${fmt(state.motionDuration)} → ${count} ${count === 1 ? "parte" : "partes"} de ${fmt(length)}`;
  if (length < MIN_SECONDS) el.textContent += ` · atenção: a Higgsfield pede no mínimo ${MIN_SECONDS}s por parte`;
}
$("#segment-seconds").addEventListener("input", renderPlan);

$("#split").addEventListener("click", async () => {
  const btn = $("#split");
  btn.disabled = true;
  try {
    const form = new FormData();
    form.append("segmentSeconds", String(segmentSeconds()));
    form.append("motion", state.motion);
    if (state.character) form.append("character", state.character);
    btn.textContent = "Enviando...";
    setJob(await api("/api/jobs", { method: "POST", body: form }));
    if (!state.character) toast("Sem personagem: adicione uma imagem se for gerar na Higgsfield.");
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Dividir vídeo";
  }
});

// ---- Projetos salvos ----

async function loadProjects() {
  const projects = await api("/api/jobs").catch(() => []);
  $("#projects").hidden = !projects.length;
  $("#project-list").replaceChildren(
    ...projects.map((p) => {
      const el = $("#project-tpl").content.firstElementChild.cloneNode(true);
      el.querySelector(".name").textContent = new Date(p.createdAt).toLocaleString("pt-BR");
      el.querySelector(".info").textContent = p.error
        ? p.error
        : `${fmt(p.duration)} · ${p.done}/${p.parts} partes prontas${p.final ? " · vídeo final pronto" : ""}`;
      el.querySelector(".open").addEventListener("click", () => openJob(p.id));
      el.querySelector(".delete").addEventListener("click", async () => {
        if (!confirm("Apagar este projeto e todos os vídeos dele?")) return;
        try {
          await api(`/api/jobs/${p.id}`, { method: "DELETE" });
          loadProjects();
        } catch (err) {
          toast(err.message, true);
        }
      });
      return el;
    })
  );
}

// ---- Login ----

$("#login").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await postJson("/api/higgsfield/login", { email: $("#email").value, password: $("#password").value });
    $("#password").value = "";
    $("#login-status").textContent = "Login salvo. Ele será usado na próxima geração.";
  } catch (err) {
    toast(err.message, true);
  }
});

// ---- Projeto aberto ----

const isActive = (job) => job.busy || Boolean(job.task);

function setJob(job) {
  state.job = job;
  location.hash = job.id;
  render();
  clearInterval(state.poll);
  state.poll = isActive(job) ? setInterval(refresh, 1500) : null;
}

async function openJob(id) {
  try {
    setJob(await api(`/api/jobs/${id}`));
  } catch (err) {
    toast(err.message, true);
    history.replaceState(null, "", location.pathname);
  }
}

async function refresh() {
  try {
    setJob(await api(`/api/jobs/${state.job.id}`));
  } catch (err) {
    clearInterval(state.poll);
    toast(err.message, true);
  }
}

function render() {
  const { job } = state;
  $("#setup").hidden = true;
  $("#projects").hidden = true;
  $("#job").hidden = false;
  if (job.loggedIn && !$("#login-status").textContent) $("#login-status").textContent = "Login salvo.";

  const done = job.segments.filter((s) => s.result).length;
  const splitting = job.task?.kind === "split";
  $("#job-info").textContent = splitting
    ? "Dividindo o vídeo..."
    : `Vídeo de ${fmt(job.duration)} dividido em ${job.segments.length} partes de até ${job.segmentSeconds}s · ` +
      `${done}/${job.segments.length} prontas` +
      (job.character ? "" : " · sem personagem");

  // Barra de progresso da divisão/junção.
  $("#task").hidden = !job.task;
  if (job.task) {
    $("#task-label").textContent = `${job.task.kind === "split" ? "Dividindo" : "Juntando"}... ${Math.round(job.task.progress * 100)}%`;
    $("#task .progress div").style.width = `${job.task.progress * 100}%`;
  }
  $("#job-error").hidden = !job.error;
  $("#job-error").textContent = job.error ?? "";

  // Fila "Gerar todas".
  const pending = job.segments.some((s) => !s.result);
  $("#generate-all").hidden = Boolean(job.queue);
  $("#generate-all").disabled = job.busy || !pending || splitting;
  $("#stop-queue").hidden = !job.queue;
  $("#stop-queue").disabled = Boolean(job.queue?.stopping);
  $("#stop-queue").textContent = job.queue?.stopping ? "Parando após a parte atual..." : "Parar fila";

  // Só recria a lista de partes quando algo dela mudou (evita recarregar os vídeos).
  const key = JSON.stringify([job.segments, job.busy]);
  if (key !== state.rendered) {
    state.rendered = key;
    $("#segments").replaceChildren(...job.segments.map(renderSegment));
  }

  $("#merge").disabled = done < job.segments.length || !job.segments.length || isActive(job);
  $("#merge").textContent = job.task?.kind === "merge" ? "Juntando..." : "Juntar vídeos";

  const final = $("#final");
  final.hidden = !job.final;
  if (job.final && final.dataset.job !== `${job.id}:${job.createdAt}:${done}`) {
    const src = `${fileUrl(job.final)}?t=${Date.now()}`;
    final.querySelector("video").src = src;
    final.querySelector("a").href = src;
    final.dataset.job = `${job.id}:${job.createdAt}:${done}`;
  } else if (!job.final) {
    delete final.dataset.job;
  }
}

const STATUS_TEXT = { queued: "Na fila.", done: "Concluído." };

function renderSegment(segment) {
  const el = $("#segment-tpl").content.firstElementChild.cloneNode(true);
  const [original, result] = el.querySelectorAll("video");
  original.src = fileUrl(`segments/${segment.file}`);
  const length = segment.end - segment.start;
  el.querySelector(".title").textContent =
    `Parte ${segment.index + 1} · ${fmt(segment.start)} a ${fmt(segment.end)} (${fmt(length)})` +
    (length < MIN_SECONDS ? " · curta demais para a Higgsfield" : "");

  if (segment.result) result.src = `${fileUrl(`results/${segment.result}`)}?v=${encodeURIComponent(segment.result)}`;
  else el.querySelector(".result").classList.add("empty");

  const status = el.querySelector(".status");
  const s = segment.status;
  if (s) {
    status.textContent = s.state === "no-credits" ? `${s.message} Recarregue e continue depois.` : s.message || STATUS_TEXT[s.state];
    status.classList.add(s.state);
  } else {
    status.textContent = segment.result ? "Resultado pronto." : "Aguardando.";
  }
  el.classList.toggle("active", s?.state === "running");

  // Links para o print e o HTML salvos quando a geração falha.
  const debug = el.querySelector(".debug");
  for (const url of s?.debug ?? []) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.textContent = url.endsWith(".png") ? "Ver print do erro" : "Ver HTML da página";
    debug.append(a);
  }

  const generate = el.querySelector(".generate");
  generate.textContent = segment.result ? "Gerar de novo" : "Gerar na Higgsfield";
  generate.disabled = state.job.busy;
  generate.addEventListener("click", async () => {
    try {
      setJob(await postJson(`/api/jobs/${state.job.id}/segments/${segment.index}/generate`));
    } catch (err) {
      toast(err.message, true);
    }
  });

  el.querySelector("input[type=file]").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("result", file);
    try {
      setJob(await api(`/api/jobs/${state.job.id}/segments/${segment.index}/result`, { method: "POST", body: form }));
    } catch (err) {
      toast(err.message, true);
    }
  });

  return el;
}

$("#generate-all").addEventListener("click", async () => {
  try {
    setJob(await postJson(`/api/jobs/${state.job.id}/generate-all`));
  } catch (err) {
    toast(err.message, true);
  }
});

$("#stop-queue").addEventListener("click", async () => {
  try {
    await postJson(`/api/jobs/${state.job.id}/generate-all/stop`);
    refresh();
  } catch (err) {
    toast(err.message, true);
  }
});

$("#merge").addEventListener("click", async () => {
  try {
    setJob(
      await postJson(`/api/jobs/${state.job.id}/merge`, {
        keepAudio: $("#keep-audio").checked,
        crossfade: $("#crossfade").checked ? CROSSFADE : 0,
      })
    );
  } catch (err) {
    toast(err.message, true);
  }
});

$("#reset").addEventListener("click", () => {
  clearInterval(state.poll);
  history.replaceState(null, "", location.pathname);
  location.reload();
});

// Reabre o projeto salvo no endereço (#id) ou lista os projetos.
const saved = location.hash.slice(1);
if (saved) openJob(saved);
else loadProjects();
