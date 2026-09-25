const $ = (sel) => document.querySelector(sel);

const state = { motion: null, character: null, job: null, poll: null };

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

const fileUrl = (name) => `/files/${state.job.id}/${name}`;
const fmt = (s) => `${Math.round(s * 10) / 10}s`;

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
    if (tag === "video") preview.play().catch(() => {});
    card.classList.add("filled");
    $("#split").disabled = !state.motion;
  });
}
pickFile("#motion", "#motion-card", "motion", "video");
pickFile("#character", "#character-card", "character", "img");

$("#split").addEventListener("click", async () => {
  const btn = $("#split");
  btn.disabled = true;
  btn.textContent = "Dividindo...";
  try {
    const form = new FormData();
    form.append("motion", state.motion);
    if (state.character) form.append("character", state.character);
    setJob(await api("/api/jobs", { method: "POST", body: form }));
    if (!state.character) toast("Sem personagem: adicione uma imagem se for gerar na Higgsfield.");
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Dividir em partes de 5s";
  }
});

// ---- Login ----

$("#login").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/api/higgsfield/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: $("#email").value, password: $("#password").value }),
    });
    $("#password").value = "";
    $("#login-status").textContent = "Login salvo. Ele será usado na próxima geração.";
  } catch (err) {
    toast(err.message, true);
  }
});

// ---- Projeto ----

function setJob(job) {
  const changed = JSON.stringify(job) !== JSON.stringify(state.job);
  state.job = job;
  location.hash = job.id;
  if (changed) render();
  clearInterval(state.poll);
  if (job.busy) state.poll = setInterval(refresh, 3000);
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
  $("#job").hidden = false;
  if (job.loggedIn && !$("#login-status").textContent) $("#login-status").textContent = "Login salvo.";

  const done = job.segments.filter((s) => s.result).length;
  $("#job-info").textContent =
    `Vídeo de ${fmt(job.duration)} dividido em ${job.segments.length} partes · ${done}/${job.segments.length} prontas` +
    (job.character ? "" : " · sem personagem");

  const list = $("#segments");
  list.replaceChildren(...job.segments.map(renderSegment));

  $("#merge").disabled = done < job.segments.length || job.busy;
  const final = $("#final");
  final.hidden = !job.final;
  if (job.final) {
    const src = `${fileUrl(job.final)}?t=${Date.now()}`;
    if (!final.dataset.src) {
      final.querySelector("video").src = src;
      final.querySelector("a").href = src;
      final.dataset.src = src;
    }
  } else {
    delete final.dataset.src;
  }
}

function renderSegment(segment) {
  const el = $("#segment-tpl").content.firstElementChild.cloneNode(true);
  const [original, result] = el.querySelectorAll("video");
  original.src = fileUrl(`segments/${segment.file}`);
  el.querySelector(".title").textContent = `Parte ${segment.index + 1} · ${fmt(segment.start)} a ${fmt(segment.end)}`;

  if (segment.result) result.src = `${fileUrl(`results/${segment.result}`)}?v=${encodeURIComponent(segment.result)}`;
  else el.querySelector(".result").classList.add("empty");

  const status = el.querySelector(".status");
  const running = segment.status?.state === "running";
  if (segment.status) {
    status.textContent = segment.status.message;
    status.classList.add(segment.status.state);
  } else {
    status.textContent = segment.result ? "Resultado pronto." : "Aguardando.";
  }
  el.classList.toggle("active", running);

  const generate = el.querySelector(".generate");
  generate.textContent = segment.result ? "Gerar de novo" : "Gerar na Higgsfield";
  generate.disabled = state.job.busy;
  generate.addEventListener("click", async () => {
    try {
      setJob(await api(`/api/jobs/${state.job.id}/segments/${segment.index}/generate`, { method: "POST" }));
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

$("#merge").addEventListener("click", async () => {
  const btn = $("#merge");
  btn.disabled = true;
  btn.textContent = "Juntando...";
  try {
    setJob(
      await api(`/api/jobs/${state.job.id}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepAudio: $("#keep-audio").checked }),
      })
    );
    toast("Vídeo final pronto.");
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.textContent = "Juntar vídeos";
    render();
  }
});

$("#reset").addEventListener("click", () => {
  clearInterval(state.poll);
  history.replaceState(null, "", location.pathname);
  location.reload();
});

// Reabre o projeto salvo no endereço (#id).
const saved = location.hash.slice(1);
if (saved) {
  api(`/api/jobs/${saved}`)
    .then(setJob)
    .catch(() => history.replaceState(null, "", location.pathname));
}
