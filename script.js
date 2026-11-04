document.documentElement.classList.add("js");

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Mobile nav ---------- */
const nav = $("#nav");
const navToggle = $("#navToggle");

function setNavOpen(open) {
  nav.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", open);
  navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}
navToggle.addEventListener("click", () => setNavOpen(!nav.classList.contains("is-open")));
$$("#navLinks a").forEach((a) => a.addEventListener("click", () => setNavOpen(false)));
document.addEventListener("keydown", (e) => e.key === "Escape" && setNavOpen(false));

/* ---------- Scroll progress, back-to-top ---------- */
const progress = $("#progress");
const toTop = $("#toTop");

function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  toTop.classList.toggle("is-visible", scrollY > innerHeight);
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Active section in nav ---------- */
const navLinks = $$("#navLinks a");
const sections = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);

const spy = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`));
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
sections.forEach((s) => spy.observe(s));

/* ---------- Reveal on scroll (staggered within a parent) ---------- */
const revealer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealer.unobserve(entry.target);
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
);
$$(".reveal").forEach((el) => {
  const siblings = $$(":scope > .reveal", el.parentElement);
  el.style.setProperty("--d", `${Math.min(siblings.indexOf(el), 8) * 0.07}s`);
  revealer.observe(el);
});

$$(".stars").forEach((el) => revealer.observe(el));

/* ---------- Count-up stats ---------- */
function countUp(el) {
  const target = +el.dataset.count;
  if (reducedMotion) return;
  // Years count up from a nearby start; small numbers from zero.
  const start = target > 1000 ? target - 40 : 0;
  const duration = 1600;
  const t0 = performance.now();
  const tick = (now) => {
    const p = Math.min((now - t0) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
const counter = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    countUp(entry.target);
    counter.unobserve(entry.target);
  });
});
$$("[data-count]").forEach((el) => counter.observe(el));

/* ---------- Services tabs ---------- */
const tabs = $$('[role="tab"]');

function selectTab(tab, focus = false) {
  tabs.forEach((t) => {
    const selected = t === tab;
    t.setAttribute("aria-selected", selected);
    t.tabIndex = selected ? 0 : -1;
    $(`#${t.getAttribute("aria-controls")}`).hidden = !selected;
  });
  if (focus) tab.focus();
  tab.scrollIntoView({ block: "nearest", inline: "center", behavior: reducedMotion ? "auto" : "smooth" });
}
tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (e) => {
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (e.key in keys) {
      e.preventDefault();
      selectTab(tabs[(i + keys[e.key] + tabs.length) % tabs.length], true);
    } else if (e.key === "Home") {
      e.preventDefault();
      selectTab(tabs[0], true);
    } else if (e.key === "End") {
      e.preventDefault();
      selectTab(tabs[tabs.length - 1], true);
    }
  });
});

/* ---------- Team bio dialog ---------- */
const dialog = $("#bioDialog");
const members = $$(".member");
let current = 0;

function showMember(i) {
  current = (i + members.length) % members.length;
  const m = members[current];
  const img = $("img", m);
  $("#bioImg").src = img.src;
  $("#bioImg").alt = img.alt;
  $("#bioName").textContent = $(".member__name", m).textContent;
  $("#bioRole").textContent = $(".member__role", m).textContent;
  $("#bioText").innerHTML = $(".member__bio", m).innerHTML;
  $(".bio__body", dialog).scrollTop = 0;
  $(".bio__grid", dialog).scrollTop = 0;
}

members.forEach((m, i) =>
  $(".member__open", m).addEventListener("click", () => {
    showMember(i);
    dialog.showModal();
    document.body.style.overflow = "hidden";
  })
);
$("#bioClose").addEventListener("click", () => dialog.close());
$("#bioPrev").addEventListener("click", () => showMember(current - 1));
$("#bioNext").addEventListener("click", () => showMember(current + 1));
dialog.addEventListener("click", (e) => e.target === dialog && dialog.close());
dialog.addEventListener("close", () => {
  document.body.style.overflow = "";
  $(".member__open", members[current]).focus();
});
dialog.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") showMember(current + 1);
  if (e.key === "ArrowLeft") showMember(current - 1);
});

/* ---------- Forms: validate, then deliver via FormSubmit (mailto fallback) ---------- */
const FIRM_EMAIL = "dawrekhamolaar@gmail.com";
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${FIRM_EMAIL}`;
const CC_EMAIL = "info@silkcover.org";

$$("form.form").forEach((form) => {
  const status = $(".form__status", form);
  const button = $('button[type="submit"]', form);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let firstInvalid = null;
    $$("input:not(.hp), textarea", form).forEach((field) => {
      const ok = field.checkValidity();
      field.closest(".field").classList.toggle("is-invalid", !ok);
      if (!ok && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
      status.textContent = "Please fill in the highlighted fields.";
      firstInvalid.focus();
      return;
    }
    const fields = $$("input, textarea, select", form).filter((f) => f.name && f.name !== "_honey");
    const payload = Object.fromEntries(fields.map((f) => [f.name, f.value]));
    payload._subject = form.dataset.subject;
    payload._template = "table";
    payload._cc = CC_EMAIL;
    payload._honey = form.elements._honey.value;

    button.disabled = true;
    status.textContent = "Sending…";
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || String(data.success) !== "true") throw new Error(data.message);
      status.textContent = "Thanks for submitting! We will get back to you soon.";
      form.reset();
    } catch {
      // Delivery failed: hand the message to the visitor's email app instead.
      const body = fields.map((f) => `${f.name}: ${f.value}`).join("\n\n");
      location.href = `mailto:${FIRM_EMAIL}?subject=${encodeURIComponent(form.dataset.subject)}&body=${encodeURIComponent(body)}`;
      status.textContent = "We couldn't send that automatically, so your email app has opened with your message ready to send.";
    } finally {
      button.disabled = false;
    }
  });
  $$("input:not(.hp), textarea", form).forEach((field) =>
    field.addEventListener("input", () => field.closest(".field").classList.remove("is-invalid"))
  );
});

/* ---------- Copy email ---------- */
$$("[data-copy]").forEach((btn) =>
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.textContent = "Copied ✓";
    } catch {
      btn.textContent = "Press ⌘/Ctrl+C";
    }
    setTimeout(() => (btn.textContent = "Copy"), 1800);
  })
);
