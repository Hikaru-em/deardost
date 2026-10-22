const SUPABASE_URL = "https://klywqiihhzxusmjiffiv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IfDxlrU-RNkxXt7nB_yJRQ_cjRy3_Qm";
const PHOTO_BUCKET = "profile-pictures";

const Q = [
  ["What was your first impression about me? 🤔💭", ["You looked so cool 😎", "You seemed shy 🙈", "One of the funniest persons 😂", "I thought you were friendly 🥰"]],
  ["How do you feel when you talk to me? 😊💬", ["Happy 😊", "Comfortable 🫶", "Excited 🤩", "I can’t stop smiling 😁"]],
  ["Things you like most in me? 🥰✨", ["Your attitude 😌", "Your smile 😍", "Your kindness 🥰", "Your sense of humour 😂"]],
  ["Things you hate in me? 😅💔", ["Your stubbornness 😤", "When you ignore me 🥲", "Nothing at all 🥹❤️", "When you tease me too much 😂"]],
  ["What is your favourite memory with me? 📸💖", ["The first time we met 🥹", "Our funniest moment 😂", "The time we talked for hours 💬❤️", "Every moment together 🫶"]],
  ["If you could add one thing in my life, what would it be? 🌟🎁", ["A girlfriend 👧❤️", "A boyfriend 👦💕", "Money 💵😂", "More happiness 😊"]],
  ["Give me a nickname 🥹💗", ["Bestie 🫂", "Troublemaker 😂", "Sweetheart 💖", "My favourite human 🥹❤️"]]
];

const app = document.querySelector("#app");
let db = null;
let friendName = "";

const params = () => new URLSearchParams(location.search);
const page = p => `?page=${encodeURIComponent(p)}`;

const escapeHTML = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

function toast(message) {
  const t = document.querySelector("#toast");
  if (!t) return;
  t.textContent = message;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3200);
}

function setup() {
  if (window.supabase && !db) {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
}

function auth(title, sub, content) {
  app.innerHTML = `
    <div class="layout">
      <section class="welcome">
        <div class="welcome-mark">💌✨</div>
        <h1>Friendship is better when we share.</h1>
        <p>Ask your friends fun questions and keep their answers in one lovely place.</p>
        <ul>
          <li>💙 Your own shareable dare link</li>
          <li>😊 Fun answers and emojis</li>
          <li>🔐 Private personal dashboard</li>
        </ul>
      </section>
      <section class="card auth-card">
        <h2>${escapeHTML(title)}</h2>
        <p class="muted">${escapeHTML(sub)}</p>
        ${content}
      </section>
    </div>`;
}

function toggle(id, button) {
  const input = document.getElementById(id);
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
  button.textContent = input.type === "password" ? "Show" : "Hide";
}

async function route() {
  setup();

  if (!db) {
    app.innerHTML = `<section class="card"><h2>Connection problem</h2><p>Supabase did not load. Check your internet connection and refresh.</p></section>`;
    return;
  }

  const p = params();
  const slug = p.get("dare");

  if (slug) {
    return p.get("step") === "questions" ? questions(slug) : namePage(slug);
  }

  const pg = p.get("page") || "login";
  if (pg === "dashboard") return dashboard();
  if (pg === "signup") return signup();
  if (pg === "forgot") return forgot();
  return login();
}

function login() {
  auth("Welcome back 👋", "Sign in to see your Friendship Dare answers.", `
    <form id="form">
      <div class="field"><label>Username</label>
        <input id="username" required autocomplete="username" placeholder="Your username">
      </div>
      <div class="field"><label>Password</label>
        <div class="pw">
          <input id="password" type="password" required autocomplete="current-password" placeholder="Your password">
          <button class="linkbtn" type="button" onclick="toggle('password',this)">Show</button>
        </div>
      </div>
      <div class="between"><span>🔒 Secure sign in</span><a href="${page("forgot")}">Forgot password?</a></div>
      <button class="btn full" type="submit">Sign in</button>
    </form>
    <div class="divider">or sign in with</div>
    <button class="btn light full" id="google" type="button">🌐 Continue with Google</button>
    <p class="bottom">Don’t have an account? <a href="${page("signup")}">Sign up for free</a></p>
  `);

  document.querySelector("#form").onsubmit = async e => {
    e.preventDefault();
    const b = e.submitter;
    b.disabled = true;

    try {
      const { data, error } = await db.functions.invoke("username-auth", {
        body: {
          action: "login",
          username: document.querySelector("#username").value.trim(),
          password: document.querySelector("#password").value
        }
      });

      if (error) throw new Error(data?.error || error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.session) throw new Error("No login session returned.");

      const { error: sessionError } = await db.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });

      if (sessionError) throw sessionError;
      location.href = page("dashboard");
    } catch (err) {
      toast(err.message || "Sign in failed.");
    } finally {
      b.disabled = false;
    }
  };

  document.querySelector("#google").onclick = async () => {
    const { error } = await db.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: location.origin + location.pathname + "?page=dashboard"
      }
    });
    if (error) toast(error.message);
  };
}

function signup() {
  auth("Create your account 🌷", "Choose a username and password. No real email required.", `
    <form id="form">
      <div class="field"><label>Username</label>
        <input id="username" required minlength="3" maxlength="24"
          pattern="[A-Za-z0-9_]+" autocomplete="username" placeholder="e.g. emmanuel">
        <p class="tiny">3–24 letters, numbers, or underscores.</p>
      </div>
      <div class="field"><label>Password</label>
        <div class="pw">
          <input id="password" type="password" minlength="8" maxlength="72"
            required autocomplete="new-password" placeholder="At least 8 characters">
          <button class="linkbtn" type="button" onclick="toggle('password',this)">Show</button>
        </div>
      </div>
      <button class="btn full" type="submit">Sign up for free ✨</button>
    </form>
    <p class="bottom">Already have an account? <a href="${page("login")}">Sign in</a></p>
  `);

  document.querySelector("#form").onsubmit = async e => {
    e.preventDefault();
    const b = e.submitter;
    b.disabled = true;
    b.textContent = "Creating account…";

    try {
      const { data, error } = await db.functions.invoke("username-auth", {
        body: {
          action: "signup",
          username: document.querySelector("#username").value.trim(),
          password: document.querySelector("#password").value
        }
      });

      if (error) throw new Error(data?.error || error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.session) throw new Error("No login session returned.");

      const { error: sessionError } = await db.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });

      if (sessionError) throw sessionError;
      location.href = page("dashboard");
    } catch (err) {
      toast(err.message || "Account creation failed.");
    } finally {
      b.disabled = false;
      b.textContent = "Sign up for free ✨";
    }
  };
}

function forgot() {
  auth("Password recovery 🔑", "Username-only accounts don't have a real email address yet.", `
    <p>Password recovery is not available until you link and verify a real email address.</p>
    <p class="bottom"><a href="${page("login")}">← Back to sign in</a></p>
  `);
}

function slugify(s) {
  return (s.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 20) || "friend")
    + "-" + Math.random().toString(36).slice(2, 7);
}

/* Profile photo display */
function avatarMarkup(url, username, extraClass = "") {
  const initial = escapeHTML((username || "F").charAt(0).toUpperCase());

  return `<div class="profile-avatar ${extraClass}" data-initial="${initial}">
    ${url
      ? `<img src="${escapeHTML(url)}" alt="Profile photo"
          loading="eager" referrerpolicy="no-referrer"
          onerror="this.remove();this.parentElement.classList.add('avatar-fallback');this.parentElement.textContent=this.parentElement.dataset.initial || 'F'">`
      : initial}
  </div>`;
}

/* Opens the uploaded photo in a large preview. */
function openPhotoPreview(url, username) {
  if (!url) {
    toast("Upload a profile photo first.");
    return;
  }

  const existing = document.querySelector(".photo-preview-modal");
  if (existing) existing.remove();

  if (!document.querySelector("#photo-preview-styles")) {
    const style = document.createElement("style");
    style.id = "photo-preview-styles";
    style.textContent = `
      .photo-preview-modal {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(10,18,35,.84);
        backdrop-filter: blur(6px);
      }
      .photo-preview-panel {
        position: relative;
        width: min(440px,100%);
        max-height: 90vh;
        overflow-y: auto;
        padding: 32px 20px 22px;
        text-align: center;
        background: #fff;
        border-radius: 22px;
        box-shadow: 0 20px 60px rgba(0,0,0,.3);
      }
      .photo-preview-image {
        display: block;
        width: min(340px,100%);
        max-height: 65vh;
        margin: 8px auto 16px;
        object-fit: contain;
        border-radius: 14px;
        background: #f3f5f7;
      }
      .photo-preview-panel p {
        margin: 10px 0 18px;
        font-weight: 600;
        overflow-wrap: anywhere;
      }
      .photo-preview-close {
        position: absolute;
        top: 8px;
        right: 10px;
        width: 38px;
        height: 38px;
        border: 0;
        border-radius: 50%;
        background: #f0f2f5;
        font-size: 26px;
        line-height: 1;
        cursor: pointer;
      }
      .photo-preview-change {
        width: 100%;
      }
      .avatar-view-button {
        display: block;
        padding: 0;
        border: 0;
        background: transparent;
        border-radius: 50%;
        cursor: zoom-in;
        overflow: hidden;
      }
      .avatar-view-button .profile-avatar {
        cursor: zoom-in;
      }
    `;
    document.head.appendChild(style);
  }

  const modal = document.createElement("div");
  modal.className = "photo-preview-modal";
  modal.innerHTML = `
    <section class="photo-preview-panel" role="dialog" aria-modal="true" aria-label="Profile photo preview">
      <button class="photo-preview-close" type="button" aria-label="Close preview">×</button>
      <img class="photo-preview-image" src="${escapeHTML(url)}" alt="${escapeHTML(username || "Profile")} profile photo">
      <p>${escapeHTML(username || "Your profile photo")}</p>
      <button class="btn photo-preview-change" type="button">Change photo 📷</button>
    </section>`;

  document.body.appendChild(modal);

  const close = () => {
    modal.remove();
    document.removeEventListener("keydown", onKeyDown);
  };

  const onKeyDown = event => {
    if (event.key === "Escape") close();
  };

  modal.querySelector(".photo-preview-close").onclick = close;

  modal.addEventListener("click", event => {
    if (event.target === modal) close();
  });

  modal.querySelector(".photo-preview-change").onclick = () => {
    close();
    document.querySelector("#photo-input")?.click();
  };

  document.addEventListener("keydown", onKeyDown);
}

async function getProfilePhotoUrl(path) {
  if (!path) return null;

  try {
    const { data, error } = await db.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(path, 3600);

    if (error) {
      console.error("Could not create a private profile photo URL:", error.message);
      return null;
    }

    return data?.signedUrl || null;
  } catch (err) {
    console.error("Could not load profile photo:", err);
    return null;
  }
}

/* Browser-based cropper: the original image is not uploaded. */
function openPhotoCropper(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const size = 320;
      const minScale = Math.max(
        size / image.naturalWidth,
        size / image.naturalHeight
      );

      let zoom = 1;
      let offsetX = 0;
      let offsetY = 0;
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let startOffsetX = 0;
      let startOffsetY = 0;
      let finished = false;

      const modal = document.createElement("div");
      modal.className = "crop-modal";
      modal.innerHTML = `
        <section class="crop-panel" role="dialog" aria-modal="true"
          aria-label="Crop profile photo">
          <h2>Crop your photo ✨</h2>
          <p class="crop-help">Drag to position your photo. Use the slider to zoom.</p>
          <div class="crop-stage" id="crop-stage">
            <canvas id="crop-canvas" width="${size}" height="${size}"></canvas>
          </div>
          <div class="crop-controls">
            <label for="crop-zoom">Zoom</label>
            <input id="crop-zoom" type="range" min="1" max="3"
              step="0.01" value="1">
          </div>
          <div class="crop-actions">
            <button type="button" class="btn crop-cancel" id="crop-cancel">Cancel</button>
            <button type="button" class="btn" id="crop-confirm">Use photo</button>
          </div>
          <p class="crop-warning">Your photo is cropped in this browser before upload.</p>
        </section>`;

      document.body.appendChild(modal);

      const canvas = modal.querySelector("#crop-canvas");
      const ctx = canvas.getContext("2d");
      const stage = modal.querySelector("#crop-stage");
      const slider = modal.querySelector("#crop-zoom");
      const confirmButton = modal.querySelector("#crop-confirm");

      function draw() {
        const scale = minScale * zoom;
        const drawWidth = image.naturalWidth * scale;
        const drawHeight = image.naturalHeight * scale;
        const maxX = Math.max(0, (drawWidth - size) / 2);
        const maxY = Math.max(0, (drawHeight - size) / 2);

        offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
        offsetY = Math.max(-maxY, Math.min(maxY, offsetY));

        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = "#eaf4f4";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(
          image,
          (size - drawWidth) / 2 + offsetX,
          (size - drawHeight) / 2 + offsetY,
          drawWidth,
          drawHeight
        );
      }

      function cleanup(result) {
        if (finished) return;
        finished = true;
        URL.revokeObjectURL(objectUrl);
        modal.remove();
        resolve(result);
      }

      slider.addEventListener("input", () => {
        zoom = Number(slider.value);
        draw();
      });

      stage.addEventListener("pointerdown", event => {
        dragging = true;
        startX = event.clientX;
        startY = event.clientY;
        startOffsetX = offsetX;
        startOffsetY = offsetY;
        stage.setPointerCapture(event.pointerId);
      });

      stage.addEventListener("pointermove", event => {
        if (!dragging) return;

        const rect = canvas.getBoundingClientRect();
        offsetX = startOffsetX +
          (event.clientX - startX) * (size / rect.width);
        offsetY = startOffsetY +
          (event.clientY - startY) * (size / rect.height);

        draw();
      });

      stage.addEventListener("pointerup", () => dragging = false);
      stage.addEventListener("pointercancel", () => dragging = false);

      modal.querySelector("#crop-cancel").addEventListener("click", () => cleanup(null));

      modal.addEventListener("click", event => {
        if (event.target === modal) cleanup(null);
      });

      confirmButton.addEventListener("click", () => {
        confirmButton.disabled = true;
        confirmButton.textContent = "Preparing…";

        canvas.toBlob(blob => {
          if (!blob) {
            confirmButton.disabled = false;
            confirmButton.textContent = "Use photo";
            toast("Could not crop this image. Please try another.");
            return;
          }

          cleanup(new File([blob], "profile-photo.jpg", {
            type: "image/jpeg",
            lastModified: Date.now()
          }));
        }, "image/jpeg", 0.88);
      });

      draw();
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This image could not be opened."));
    };

    image.src = objectUrl;
  });
}

async function dashboard() {
  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    location.href = page("login");
    return;
  }

  const username = user.user_metadata?.username ||
    user.email?.split("@")[0] || "friend";

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    app.innerHTML = `<section class="card"><h2>Dashboard setup needed</h2><p>${escapeHTML(profileError.message)}</p></section>`;
    return;
  }

  const currentProfile = profile || { username };
  const photoPath = user.user_metadata?.profile_photo_path || null;
  const photoUrl = await getProfilePhotoUrl(photoPath);

  let { data: links, error: linkError } = await db
    .from("dare_links")
    .select("id,slug,created_at")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  let dare = links?.[0];

  if (!linkError && !dare) {
    const result = await db.from("dare_links").insert({
      owner_id: user.id,
      slug: slugify(currentProfile.username || username),
      is_active: true
    }).select("id,slug,created_at").single();

    dare = result.data;
    linkError = result.error;
  }

  if (linkError || !dare) {
    app.innerHTML = `<section class="card"><h2>Dashboard setup needed</h2><p>${escapeHTML(linkError?.message || "Could not create your dare link.")}</p></section>`;
    return;
  }

  const { data: allLinks, error: allLinksError } = await db
    .from("dare_links")
    .select("id")
    .eq("owner_id", user.id);

  const linkIds = (allLinks || []).map(link => link.id);
  let responses = [];
  let responseError = allLinksError || null;

  if (linkIds.length && !responseError) {
    const result = await db.from("responses")
      .select("id,friend_name,answers,submitted_at,dare_link_id")
      .in("dare_link_id", linkIds)
      .order("submitted_at", { ascending: true });

    responses = result.data || [];
    responseError = result.error;
  }

  const friendCount = new Set(
    responses.map(r => (r.friend_name || "").trim().toLowerCase())
  ).size;

  const currentUrl = new URL(location.href);
  const dareUrl = `${currentUrl.origin}${currentUrl.pathname}?dare=${encodeURIComponent(dare.slug)}`;

  const renderAnswer = (response, index) => {
    const answers = Q.map((question, i) => {
      const answer = Array.isArray(response.answers)
        ? (typeof response.answers[i] === "string"
          ? response.answers[i]
          : response.answers[i]?.answer)
        : response.answers?.[String(i)] || "—";

      return `<div class="answer"><b>${escapeHTML(question[0])}</b><p>${escapeHTML(answer || "—")}</p></div>`;
    }).join("");

    return `<article class="response friend-card" id="response-${index}"
      data-friend="${escapeHTML((response.friend_name || "").toLowerCase())}">
      <div class="friend-header"><div>
        <div class="eyebrow">FRIEND #${index + 1}</div>
        <h3>💌 ${escapeHTML(response.friend_name)}</h3>
        <p class="tiny">${response.submitted_at ? new Date(response.submitted_at).toLocaleString() : ""}</p>
      </div><button class="btn light copy-answers" type="button" data-index="${index}">Copy answers</button></div>
      <div class="answers-grid">${answers}</div>
    </article>`;
  };

  app.innerHTML = `
    <div class="dashboard-top">
      <div class="dashboard-greeting">
        <div class="eyebrow">YOUR PRIVATE SPACE ✨</div>
        <h1>Welcome, ${escapeHTML(currentProfile.username || username)}! 💙</h1>
        <p>Your friends' honest answers, organized in one place.</p>
      </div>
      <div class="dashboard-profile">
        <div class="avatar-upload">
          <button class="avatar-view-button" id="view-profile-photo" type="button"
            title="View profile photo" aria-label="View profile photo">
            ${avatarMarkup(photoUrl, currentProfile.username || username)}
          </button>
          <label class="avatar-camera" for="photo-input" title="Change profile photo" aria-label="Change profile photo">📷</label>
        </div>
        <input type="file" id="photo-input" accept="image/jpeg,image/png,image/webp" hidden>
        <span class="tiny">Click photo to view · 📷 to change</span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">💌</div><div><p>Total responses</p><h2>${responses.length}</h2></div></div>
      <div class="stat-card"><div class="stat-icon">🫂</div><div><p>Friends who answered</p><h2>${friendCount}</h2></div></div>
      <div class="stat-card"><div class="stat-icon">✨</div><div><p>Questions per dare</p><h2>${Q.length}</h2></div></div>
    </div>

    <div class="grid dashboard-grid">
      <section class="card dashboard-card">
        <div class="section-icon">🔗</div>
        <h3>Your dare link</h3>
        <p class="muted">Share your personal link. Friends can answer without creating an account.</p>
        <div class="field"><label>Personal link</label><div class="share">
          <input id="url" readonly value="${escapeHTML(dareUrl)}">
          <button class="btn" id="copy" type="button">Copy link</button>
        </div></div>
        <div class="action-row">
          <button class="btn light" id="preview" type="button">Preview dare ↗</button>
          <button class="btn light" id="new" type="button">Create new link</button>
        </div>
      </section>

      <section class="card dashboard-card">
        <div class="section-icon">👤</div>
        <h3>Account settings</h3>
        <form id="profile">
          <div class="field"><label>Username</label>
            <input id="display" required minlength="3" maxlength="24"
              pattern="[A-Za-z0-9_]+" value="${escapeHTML(currentProfile.username || username)}">
          </div>
          <button class="btn full" type="submit">Save username</button>
        </form>
        <button class="btn light full" id="remove-photo" type="button"
          style="margin-top:10px" ${photoPath ? "" : "disabled"}>Remove profile photo</button>
        <button class="btn light full" id="signout" type="button" style="margin-top:10px">Sign out</button>
      </section>
    </div>

    <section class="card responses-section">
      <div class="responses-title"><div><div class="eyebrow">THE GOOD STUFF</div>
        <h2>💌 Friends' answers</h2>
        <p class="muted">Search for a friend or jump straight to their answers.</p>
      </div><div class="response-count">${responses.length} responses</div></div>
      ${responseError ? `<p class="note">${escapeHTML(responseError.message)}</p>` : ""}
      ${responses.length ? `
        <div class="field"><label>Search friends</label><input id="search-friends" placeholder="Search by friend's name..."></div>
        <div class="friend-navigation" id="friend-navigation">
          ${responses.map((r, i) => `<button type="button" class="friend-chip" data-target="response-${i}" data-name="${escapeHTML((r.friend_name || "").toLowerCase())}">👤 ${escapeHTML(r.friend_name)}</button>`).join("")}
        </div>
        <div id="friend-responses">${responses.map(renderAnswer).join("")}</div>
      ` : `<div class="center"><div class="emoji">🦋</div><h3>No answers yet</h3><p class="muted">Copy your dare link and share it with your friends.</p></div>`}
    </section>`;

  /* Clicking the photo opens the preview; the camera label opens the file picker. */
  document.querySelector("#view-profile-photo").onclick = () => {
    if (photoUrl) {
      openPhotoPreview(photoUrl, currentProfile.username || username);
    } else {
      toast("Upload a profile photo first.");
    }
  };

  document.querySelector("#photo-input").onchange = async e => {
    const input = e.target;
    const originalFile = input.files?.[0];
    if (!originalFile) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(originalFile.type)) {
      toast("Choose a JPEG, PNG, or WebP image.");
      input.value = "";
      return;
    }

    if (originalFile.size > 12 * 1024 * 1024) {
      toast("Choose an image smaller than 12 MB.");
      input.value = "";
      return;
    }

    let croppedFile;

    try {
      croppedFile = await openPhotoCropper(originalFile);
    } catch (err) {
      toast(err.message || "Could not open the crop tool.");
      input.value = "";
      return;
    }

    if (!croppedFile) {
      input.value = "";
      return;
    }

    const label = document.querySelector(".avatar-upload");
    label.classList.add("uploading");
    toast("Uploading profile photo…");

    let uploadedPath = null;

    try {
      const path = `${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await db.storage
        .from(PHOTO_BUCKET)
        .upload(path, croppedFile, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) throw uploadError;
      uploadedPath = path;

      const { error: metadataError } = await db.auth.updateUser({
        data: { profile_photo_path: path }
      });

      if (metadataError) throw metadataError;

      if (photoPath && photoPath !== path) {
        const { error: deleteError } = await db.storage
          .from(PHOTO_BUCKET)
          .remove([photoPath]);

        if (deleteError) {
          console.warn("Old photo cleanup failed:", deleteError.message);
        }
      }

      toast("Profile photo updated! 💙");
      await dashboard();
    } catch (err) {
      if (uploadedPath) {
        await db.storage.from(PHOTO_BUCKET).remove([uploadedPath]);
      }

      console.error("Profile photo upload failed:", err);
      toast(err.message || "Photo upload failed. Check your Storage bucket policies.");
    } finally {
      input.value = "";
      document.querySelector(".avatar-upload")?.classList.remove("uploading");
    }
  };

  document.querySelector("#remove-photo").onclick = async () => {
    if (!photoPath) return;
    if (!confirm("Remove your profile photo?")) return;

    const button = document.querySelector("#remove-photo");
    button.disabled = true;

    try {
      const { error: metadataError } = await db.auth.updateUser({
        data: { profile_photo_path: null }
      });

      if (metadataError) throw metadataError;

      const { error: deleteError } = await db.storage
        .from(PHOTO_BUCKET)
        .remove([photoPath]);

      if (deleteError) console.warn("Photo cleanup failed:", deleteError.message);

      toast("Profile photo removed.");
      await dashboard();
    } catch (err) {
      toast(err.message || "Could not remove photo.");
      button.disabled = false;
    }
  };

  document.querySelector("#copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(dareUrl);
      toast("Dare link copied! 💙");
    } catch {
      document.querySelector("#url").select();
      toast("Select and copy the link.");
    }
  };

  document.querySelector("#preview").onclick = () => window.open(dareUrl, "_blank", "noopener");

  const search = document.querySelector("#search-friends");

  if (search) {
    search.oninput = () => {
      const term = search.value.trim().toLowerCase();

      document.querySelectorAll(".friend-card").forEach(card => {
        card.style.display = card.dataset.friend.includes(term) ? "" : "none";
      });

      document.querySelectorAll(".friend-chip").forEach(chip => {
        chip.style.display = chip.dataset.name.includes(term) ? "" : "none";
      });
    };
  }

  document.querySelectorAll(".friend-chip").forEach(chip => {
    chip.onclick = () => {
      const target = document.getElementById(chip.dataset.target);
      if (!target) return;

      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.style.outline = "2px solid #36bfc1";
      setTimeout(() => target.style.outline = "", 1800);
    };
  });

  document.querySelectorAll(".copy-answers").forEach(button => {
    button.onclick = async () => {
      const card = document.getElementById(`response-${button.dataset.index}`);

      try {
        await navigator.clipboard.writeText(card.innerText);
        toast("Answers copied! 💙");
      } catch {
        toast("Unable to copy answers.");
      }
    };
  });

  document.querySelector("#new").onclick = async () => {
    if (!confirm("Create a new link? Your current link will stop accepting answers.")) return;

    const { error } = await db.from("dare_links")
      .update({ is_active: false })
      .eq("id", dare.id);

    if (error) return toast(error.message);

    const result = await db.from("dare_links").insert({
      owner_id: user.id,
      slug: slugify(currentProfile.username || username),
      is_active: true
    }).select("id").single();

    if (result.error) toast(result.error.message);
    else dashboard();
  };

  document.querySelector("#signout").onclick = async () => {
    await db.auth.signOut();
    location.href = page("login");
  };

  document.querySelector("#profile").onsubmit = async e => {
    e.preventDefault();

    const name = document.querySelector("#display").value.trim();
    const button = e.submitter;
    button.disabled = true;

    try {
      const { error } = await db.from("profiles")
        .update({ username: name })
        .eq("id", user.id);

      if (error) throw error;

      const { error: metadataError } = await db.auth.updateUser({
        data: { username: name }
      });

      if (metadataError) throw metadataError;

      toast("Username saved!");
      await dashboard();
    } catch (err) {
      toast(err.message || "Could not save username.");
    } finally {
      button.disabled = false;
    }
  };
}

async function resolveDare(slug) {
  const { data, error } = await db.rpc("get_public_dare_link", {
    p_slug: slug
  });

  return { data: Array.isArray(data) ? data[0] : data, error };
}

async function namePage(slug) {
  const { data, error } = await resolveDare(slug);

  if (error || !data) {
    app.innerHTML = `<section class="card center"><div class="emoji">🔎</div><h2>Link not found</h2><p class="muted">${escapeHTML(error?.message || "Ask your friend for their latest dare link.")}</p></section>`;
    return;
  }

  app.innerHTML = `
    <div class="heading"><div class="welcome-mark">💌🦋</div><h1>Friendship Dare</h1>
      <p>Someone wants to know what you think! Answer honestly and make their day. 😊</p></div>
    <section class="card guest-card">
      <form id="nameform">
        <div class="field"><label>First, what should we call you? 👋</label>
          <input id="friend" required maxlength="100" placeholder="Enter your name">
        </div>
        <button class="btn full" type="submit">Let's start the dare ✨</button>
      </form>
      <p class="tiny center">No account needed. Your friend will see your answers.</p>
    </section>`;

  document.querySelector("#nameform").onsubmit = e => {
    e.preventDefault();
    friendName = document.querySelector("#friend").value.trim();
    sessionStorage.setItem("dd_friend", friendName);
    location.href = `?dare=${encodeURIComponent(slug)}&step=questions`;
  };
}

async function questions(slug) {
  const { data, error } = await resolveDare(slug);
  if (error || !data) return namePage(slug);

  friendName = sessionStorage.getItem("dd_friend") || "";
  if (!friendName) return namePage(slug);

  app.innerHTML = `
    <div class="heading"><div class="welcome-mark">🫶✨</div>
      <h1>Let's do this, ${escapeHTML(friendName)}!</h1>
      <p>Choose a ready-made answer or write your own. You can edit any answer before submitting. 💙</p></div>
    <form class="card guest-card" id="answers">
      ${Q.map((question, i) => `<div class="question"><h3>${i + 1}. ${escapeHTML(question[0])}</h3>
        ${question[1].map(choice => `<button type="button" class="pill" data-q="${i}" data-a="${escapeHTML(choice)}">${escapeHTML(choice)}</button>`).join("")}
        <div class="field"><label for="a${i}">Your answer</label><textarea id="a${i}" maxlength="1000" placeholder="Type your answer here…"></textarea></div>
      </div>`).join("")}
      <button class="btn full" id="send" type="submit">Submit all answers 💌</button>
      <p class="tiny center">Your answers are sent together. Review them before submitting.</p>
    </form>`;

  document.querySelectorAll(".pill").forEach(button => {
    button.onclick = () => {
      const textarea = document.querySelector("#a" + button.dataset.q);
      textarea.value = button.dataset.a;
      textarea.focus();
    };
  });

  document.querySelector("#answers").onsubmit = async e => {
    e.preventDefault();

    const answers = Q.map((question, i) =>
      document.querySelector("#a" + i).value.trim()
    );

    if (answers.every(answer => !answer)) {
      toast("Please answer at least one question.");
      return;
    }

    const button = document.querySelector("#send");
    button.disabled = true;
    button.textContent = "Sending…";

    const payload = Q.map((question, i) => ({
      question: question[0],
      answer: answers[i]
    }));

    try {
      const { error: submitError } = await db.rpc("submit_friendship_answers", {
        p_slug: data.slug || slug,
        p_friend_name: friendName,
        p_answers: payload
      });

      if (submitError) throw submitError;

      sessionStorage.removeItem("dd_friend");

      app.innerHTML = `<section class="card center success-card">
        <div class="emoji">🎉💙</div>
        <h2>Answers sent!</h2>
        <p class="muted">Thank you, ${escapeHTML(friendName)}! Your answers have been sent successfully.</p>
        <p>Keep spreading kindness and good vibes. 🦋</p>
      </section>`;
    } catch (err) {
      toast(err.message || "Could not submit answers.");
      button.disabled = false;
      button.textContent = "Submit all answers 💌";
    }
  };
}

route();