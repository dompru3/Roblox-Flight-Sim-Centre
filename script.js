import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
import {
  getFirestore, collection, addDoc, getDocs, deleteDoc,
  doc, updateDoc, increment, orderBy, query, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
  getStorage, ref, uploadString, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-storage.js";

// ── FIREBASE CONFIG ───────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDh0BNqzhw1beXWX2RrGL-EFNOvnqYRSd4",
  authDomain: "roblox-flight-sim-centre.firebaseapp.com",
  projectId: "roblox-flight-sim-centre",
  storageBucket: "roblox-flight-sim-centre.firebasestorage.app",
  messagingSenderId: "542829325424",
  appId: "1:542829325424:web:1d17f945d9c9ee75e718b5",
  measurementId: "G-8F5CJ14FDN"
};

const app       = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db        = getFirestore(app);
const storage   = getStorage(app);

// ── NAVIGATION ────────────────────────────────
window.goPage = function(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + page).classList.add("active");
  document.getElementById("navBack").style.display = "inline-flex";
  window.scrollTo(0, 0);
  renderPage(page);
};

window.goHome = function() {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-home").classList.add("active");
  document.getElementById("navBack").style.display = "none";
  window.scrollTo(0, 0);
};

function renderPage(page) {
  if (page === "about")       renderAbout();
  if (page === "suggestions") renderSuggestions();
  if (page === "complaints")  renderComplaints();
  if (page === "photos")      renderPhotos();
  if (page === "more")        renderMore();
}

// ── ABOUT ─────────────────────────────────────
function renderAbout() {
  // Static content only — nothing to load
}

// ── SUGGESTIONS ───────────────────────────────
function renderSuggestions() {
  const feed = document.getElementById("sugFeed");
  feed.innerHTML = "<div class='loading-spinner'>Loading...</div>";

  const q = query(collection(db, "suggestions"), orderBy("timestamp", "desc"));
  onSnapshot(q, snapshot => {
    if (snapshot.empty) {
      feed.innerHTML = "<div class='glass-card' style='text-align:center;color:var(--text-light);'>No suggestions yet - be the first!</div>";
      return;
    }
    feed.innerHTML = snapshot.docs.map(d => {
      const s = d.data();
      const id = d.id;
      return `
        <div class="feed-item">
          <div class="feed-item-header">
            <div class="feed-item-meta">
              <div class="feed-avatar">&#x2708;&#xFE0F;</div>
              <div>
                <div class="feed-username">${esc(s.username)}</div>
                <div class="feed-time">${formatTime(s.timestamp)}</div>
              </div>
            </div>
            <span class="feed-tag tag-suggestion">${esc(s.category)}</span>
          </div>
          <div class="feed-text">${esc(s.text)}</div>
          <div class="feed-actions">
            <button class="btn-sm btn-sm-like" onclick="likeSug('${id}')">&#x1F44D; ${s.likes || 0}</button>
            <button class="btn-sm btn-sm-delete" onclick="deleteSug('${id}')">Remove</button>
          </div>
        </div>`;
    }).join("");
    updateStats();
  });
}

window.submitSuggestion = async function() {
  const name = document.getElementById("sugName").value.trim();
  const text = document.getElementById("sugText").value.trim();
  const cat  = document.getElementById("sugCat").value;
  if (!name || !text) { alert("Please fill in your username and suggestion."); return; }
  try {
    await addDoc(collection(db, "suggestions"), { username: name, category: cat, text, likes: 0, timestamp: serverTimestamp() });
    document.getElementById("sugName").value = "";
    document.getElementById("sugText").value = "";
    showAlert("sugAlert");
  } catch (e) {
    showAlert("sugError");
  }
};

window.likeSug = async function(id) {
  try { await updateDoc(doc(db, "suggestions", id), { likes: increment(1) }); } catch (e) {}
};

window.deleteSug = async function(id) {
  if (!confirm("Remove this suggestion?")) return;
  try { await deleteDoc(doc(db, "suggestions", id)); } catch (e) {}
};

// ── COMPLAINTS ────────────────────────────────
function renderComplaints() {
  const feed = document.getElementById("cmpFeed");
  feed.innerHTML = "<div class='loading-spinner'>Loading...</div>";

  const priorityColor = { High: "#f08080", Medium: "#f7c65a", Low: "#5ec07a" };
  const q = query(collection(db, "complaints"), orderBy("timestamp", "desc"));

  onSnapshot(q, snapshot => {
    if (snapshot.empty) {
      feed.innerHTML = "<div class='glass-card' style='text-align:center;color:var(--text-light);'>No reports yet - all clear!</div>";
      return;
    }
    feed.innerHTML = snapshot.docs.map(d => {
      const c = d.data();
      const id = d.id;
      const color = priorityColor[c.priority] || "#5bafd6";
      return `
        <div class="feed-item" style="border-left:4px solid ${color}">
          <div class="feed-item-header">
            <div class="feed-item-meta">
              <div class="feed-avatar">&#x1F4E2;</div>
              <div>
                <div class="feed-username">${esc(c.username)}</div>
                <div class="feed-time">${formatTime(c.timestamp)}</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
              <span class="feed-tag tag-complaint">${esc(c.type)}</span>
              <span style="font-size:.72rem;font-weight:800;color:var(--text-light)">${esc(c.priority)}</span>
            </div>
          </div>
          <div class="feed-text">${esc(c.text)}</div>
          <div class="feed-actions">
            <button class="btn-sm btn-sm-resolve" onclick="resolveCmp('${id}')">Resolve</button>
            <button class="btn-sm btn-sm-delete" onclick="deleteCmp('${id}')">Remove</button>
          </div>
        </div>`;
    }).join("");
    updateStats();
  });
}

window.submitComplaint = async function() {
  const name     = document.getElementById("cmpName").value.trim();
  const text     = document.getElementById("cmpText").value.trim();
  const type     = document.getElementById("cmpType").value;
  const priority = document.getElementById("cmpPriority").value;
  if (!name || !text) { alert("Please fill in your username and describe the issue."); return; }
  try {
    await addDoc(collection(db, "complaints"), { username: name, type, priority, text, timestamp: serverTimestamp() });
    document.getElementById("cmpName").value = "";
    document.getElementById("cmpText").value = "";
    showAlert("cmpAlert");
  } catch (e) {
    showAlert("cmpError");
  }
};

window.resolveCmp = async function(id) {
  try { await deleteDoc(doc(db, "complaints", id)); } catch (e) {}
};

window.deleteCmp = async function(id) {
  if (!confirm("Remove?")) return;
  try { await deleteDoc(doc(db, "complaints", id)); } catch (e) {}
};

// ── PHOTOS ────────────────────────────────────
let pendingPhotoData = null;

function renderPhotos() {
  const grid = document.getElementById("photoGrid");
  grid.innerHTML = "<div class='loading-spinner'>Loading...</div>";

  const q = query(collection(db, "photos"), orderBy("timestamp", "desc"));
  onSnapshot(q, snapshot => {
    if (snapshot.empty) {
      grid.innerHTML = "<div class='glass-card' style='text-align:center;color:var(--text-light);grid-column:1/-1;'>No photos yet - be the first to upload!</div>";
      return;
    }
    grid.innerHTML = snapshot.docs.map(d => {
      const p = d.data();
      const id = d.id;
      const inner = p.imgUrl
        ? `<img src="${p.imgUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">`
        : `&#x1F5BC;&#xFE0F;<span>${esc(p.title)}</span>`;
      return `
        <div class="photo-card" onclick="openPhoto('${id}')">
          <div class="photo-placeholder">${inner}</div>
          <div class="photo-info">
            <div class="photo-title">${esc(p.title)}</div>
            <div class="photo-author">by ${esc(p.author)} &middot; ${formatTime(p.timestamp)}</div>
          </div>
        </div>`;
    }).join("");
    updateStats();
  });
}

window.handlePhotoUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { alert("File too large. Max 5MB."); return; }
  const reader = new FileReader();
  reader.onload = e => {
    pendingPhotoData = e.target.result;
    document.getElementById("previewImg").src = pendingPhotoData;
    document.getElementById("uploadForm").style.display = "block";
    document.getElementById("photoFileInput").value = "";
  };
  reader.readAsDataURL(file);
};

window.confirmPhotoUpload = async function() {
  const title  = document.getElementById("photoTitle").value.trim();
  const author = document.getElementById("photoAuthor").value.trim();
  if (!title || !author) { alert("Please add a title and username."); return; }
  try {
    const storageRef = ref(storage, "photos/" + Date.now());
    await uploadString(storageRef, pendingPhotoData, "data_url");
    const imgUrl = await getDownloadURL(storageRef);
    await addDoc(collection(db, "photos"), { title, author, imgUrl, timestamp: serverTimestamp() });
    pendingPhotoData = null;
    document.getElementById("photoTitle").value  = "";
    document.getElementById("photoAuthor").value = "";
    document.getElementById("uploadForm").style.display = "none";
  } catch (e) {
    showAlert("photoError");
  }
};

window.cancelUpload = function() {
  pendingPhotoData = null;
  document.getElementById("uploadForm").style.display = "none";
};

window.openPhoto = async function(id) {
  try {
    const snap = await getDocs(collection(db, "photos"));
    const d = snap.docs.find(x => x.id === id);
    if (!d) return;
    const p = d.data();
    const wrap = document.getElementById("modalImgWrap");
    wrap.innerHTML = p.imgUrl
      ? `<img src="${p.imgUrl}" style="width:100%;border-radius:10px;max-height:300px;object-fit:cover;display:block;">`
      : `<div style="width:100%;aspect-ratio:16/9;background:linear-gradient(135deg,#c8e6ff,#5bafd6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:4rem;">&#x1F5BC;&#xFE0F;</div>`;
    document.getElementById("modalTitle").textContent = p.title;
    document.getElementById("modalMeta").textContent  = "By " + p.author + " - " + formatTime(p.timestamp);
    document.getElementById("photoModal").classList.add("open");
  } catch (e) {}
};

window.closeModal = function(e) {
  if (e.target === document.getElementById("photoModal")) {
    document.getElementById("photoModal").classList.remove("open");
  }
};

// ── MORE / STATS ──────────────────────────────
function renderMore() {
  updateStats();
}

async function updateStats() {
  try {
    const [s, c, p] = await Promise.all([
      getDocs(collection(db, "suggestions")),
      getDocs(collection(db, "complaints")),
      getDocs(collection(db, "photos"))
    ]);
    const ss = document.getElementById("statSug");
    const sc = document.getElementById("statCmp");
    const sp = document.getElementById("statPho");
    if (ss) ss.textContent = s.size;
    if (sc) sc.textContent = c.size;
    if (sp) sp.textContent = p.size;
  } catch (e) {}
}

// ── UTILS ─────────────────────────────────────
function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatTime(ts) {
  if (!ts) return "Just now";
  const d    = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return Math.floor(diff / 60) + " min ago";
  if (diff < 86400) return Math.floor(diff / 3600) + " hr ago";
  return Math.floor(diff / 86400) + " days ago";
}

function showAlert(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}

// ── CLOUDS ────────────────────────────────────
(function spawnClouds() {
  const sky = document.getElementById("skyBg");
  const st  = document.createElement("style");
  st.textContent = "@keyframes driftRight{from{transform:translateX(0)}to{transform:translateX(110vw)}}";
  document.head.appendChild(st);

  [
    { top: "8%",  left: "-20%", w: 180, h: 55, o: .85, d: 90  },
    { top: "12%", left: "-50%", w: 240, h: 65, o: .75, d: 120 },
    { top: "22%", left: "-35%", w: 160, h: 45, o: .65, d: 100 },
    { top: "5%",  left: "-70%", w: 130, h: 40, o: .70, d: 80  },
    { top: "30%", left: "-15%", w: 200, h: 55, o: .55, d: 110 },
    { top: "38%", left: "-60%", w: 140, h: 40, o: .45, d: 95  },
    { top: "45%", left: "-40%", w: 110, h: 32, o: .38, d: 130 }
  ].forEach((c, i) => {
    const el = document.createElement("div");
    el.className = "cloud";
    el.style.cssText = `top:${c.top};left:${c.left};width:${c.w}px;height:${c.h}px;opacity:${c.o};position:absolute;background:rgba(255,255,255,.82);border-radius:50px;box-shadow:0 6px 24px rgba(180,220,255,.3);animation:driftRight ${c.d}s linear infinite;animation-delay:-${(c.d / 7) * i}s;`;

    const p1 = document.createElement("div");
    p1.style.cssText = `position:absolute;top:-${Math.round(c.h * .45)}px;left:${Math.round(c.w * .2)}px;width:${Math.round(c.w * .45)}px;height:${Math.round(c.h * 1.1)}px;background:rgba(255,255,255,${c.o});border-radius:50%;`;

    const p2 = document.createElement("div");
    p2.style.cssText = `position:absolute;top:-${Math.round(c.h * .3)}px;left:${Math.round(c.w * .5)}px;width:${Math.round(c.w * .32)}px;height:${Math.round(c.h * .9)}px;background:rgba(255,255,255,${c.o});border-radius:50%;`;

    el.appendChild(p1);
    el.appendChild(p2);
    sky.appendChild(el);
  });
})();
