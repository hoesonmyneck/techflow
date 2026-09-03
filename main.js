(function () {
  "use strict";

  var header = document.getElementById("siteHeader");
  var burger = document.getElementById("burger");
  var mobileNav = document.getElementById("mobileNav");

  /* header shadow once the page is scrolled past the top (sentinel, no scroll listener) */
  var sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none;";
  document.body.prepend(sentinel);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      header.classList.toggle("scrolled", !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  /* mobile nav toggle */
  function setMenu(open) {
    burger.setAttribute("aria-expanded", String(open));
    mobileNav.hidden = !open;
    burger.querySelector("i").className = open ? "ph ph-x" : "ph ph-list";
  }
  burger.addEventListener("click", function () {
    setMenu(mobileNav.hidden);
  });
  mobileNav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !mobileNav.hidden) {
      setMenu(false);
      burger.focus();
    }
  });
  var mq = window.matchMedia("(min-width: 1001px)");
  var mqHandler = function (e) { if (e.matches) setMenu(false); };
  if (mq.addEventListener) mq.addEventListener("change", mqHandler);
  else if (mq.addListener) mq.addListener(mqHandler);

  /* Logo -> the very top of the page. The href on its own is not enough on a
     real iPhone: the fragment target has to have a generated box for Safari to
     resolve it, and scroll-padding-top would otherwise park the jump one header
     short of the top. Scrolling to 0 by hand lands on the true top on every
     engine, and leaves the address bar clean instead of appending #top. The
     href stays as the fallback for a new tab, a middle click, or no JS. */
  var logo = document.querySelector(".logo");
  if (logo) {
    logo.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      e.preventDefault();
      setMenu(false);
      try {
        window.scrollTo({ top: 0, left: 0 });
      } catch (err) {
        window.scrollTo(0, 0);   /* no options object: jump instead */
      }
    });
  }

  /* scroll reveal */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var revealAll = function () {
    reveals.forEach(function (el) { el.classList.add("in"); });
  };
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach(function (el) { io.observe(el); });
    /* Failsafe, limited to what the reader can already see. Revealing the whole
       page here would mean every block below the fold is already shown by the
       time it is scrolled to, and none of them would ever animate. */
    window.addEventListener("load", function () {
      setTimeout(function () {
        reveals.forEach(function (el) {
          if (el.classList.contains("in")) return;
          if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in");
        });
      }, 1200);
    });
  } else {
    revealAll();
  }

  /* active nav link via section observer */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a"));
  var sections = navLinks
    .map(function (a) {
      return document.querySelector(a.getAttribute("href"));
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.id;
            navLinks.forEach(function (a) {
              a.classList.toggle("is-active", a.getAttribute("href") === "#" + id);
            });
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach(function (s) {
      spy.observe(s);
    });
  }

  /* concrete pour: span it from the hairline above the stats block
     down to the bottom of the footer (no scroll listener needed) */
  var pour = document.querySelector(".pour");
  var statsEl = document.querySelector(".stats");
  var footerEl = document.querySelector(".site-footer");

  var POUR_GAP = 8;     /* breathing room before the content edge */
  var POUR_MIN = 60;    /* below this the left margin is too tight, so skip it */
  var POUR_MAX = 300;
  var HEAD = 0.882;     /* where the stream starts, as a fraction of the band */
  var CHUTE = 0.105;    /* where the mirrored chute sits, as a fraction of the truck */

  /* An element's box with the reveal transforms taken back out.
     getBoundingClientRect() includes them, and the stats block sits 16px low
     until its own reveal fires, so measuring it raw would drag the pour down
     with it and leave it there. Reveals only ever translate, so summing the
     translation up the ancestor chain is enough. */
  function rawRect(el) {
    var r = el.getBoundingClientRect();
    var dx = 0, dy = 0;
    for (var n = el; n && n !== document.documentElement; n = n.parentElement) {
      var t = window.getComputedStyle(n).transform;
      if (!t || t === "none") continue;
      try {
        var m = new DOMMatrixReadOnly(t);
        dx += m.m41;
        dy += m.m42;
      } catch (e) { /* no DOMMatrix: leave the measurement as it is */ }
    }
    return {
      top: r.top - dy, bottom: r.bottom - dy,
      left: r.left - dx, right: r.right - dx
    };
  }

  function layoutPour() {
    if (!statsEl) return;
    var rect = rawRect(statsEl);
    var room = rect.left - POUR_GAP;                     /* usable left margin */
    var width = Math.min(POUR_MAX, room * 0.58);
    var enough = width >= POUR_MIN;

    /* the road and the mixer are anchored to the hairline in CSS; all JS does
       is say whether the gutter is wide enough and how big the truck gets.
       No rounding: on a scaled display (125% / 150%) the layout lands on
       fractional pixels, and snapping to whole ones reintroduces a seam. */
    statsEl.classList.toggle("stats--road", enough);
    if (enough) {
      /* both margins get the same run of road; clientWidth leaves the
         scrollbar out, so the right one stops exactly at the window edge */
      var docW = document.documentElement.clientWidth;
      statsEl.style.setProperty("--road-l", rect.left + "px");
      statsEl.style.setProperty("--road-r", Math.max(0, docW - rect.right) + "px");

      var head = width * HEAD;
      var mw = Math.max(96, Math.min(180, (room - head) / (1 - CHUTE)));
      statsEl.style.setProperty("--rig-w", mw + "px");
      statsEl.style.setProperty("--rig-gap", (rect.left - head - mw * (1 - CHUTE)) + "px");
    }

    if (!pour || !footerEl) return;
    if (!enough) {
      pour.classList.remove("pour--on");
      return;
    }
    var y = window.scrollY || window.pageYOffset || 0;
    var top = rect.top + y;
    var bottom = rawRect(footerEl).bottom + y;

    pour.classList.add("pour--on");
    pour.style.width = width + "px";
    pour.style.top = top + "px";
    pour.style.height = Math.max(0, bottom - top) + "px";
  }

  if (statsEl) {
    layoutPour();
    window.addEventListener("load", layoutPour);
    /* webfonts land after first layout and shift everything down */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(layoutPour);
    }
    if ("ResizeObserver" in window) {
      new ResizeObserver(layoutPour).observe(document.body);
    } else {
      window.addEventListener("resize", layoutPour);
    }

    /* progressive fill: markers spread down the stream, each one that scrolls
       into view pushes the fill a step further (concrete never un-pours) */
    /* One step every ~24px of stream rather than a fixed count: the tip rests
       on the last step it passed, so a coarse ladder lets the scroll walk a
       tenth of a screen away from it before the next step catches up, and the
       pour reads as lagging well above where it should be. */
    var reveal = pour && pour.querySelector(".pour__reveal");
    var band = pour ? pour.getBoundingClientRect().height : 0;
    var STEPS = Math.max(60, Math.min(400, Math.round(band / 24)));
    var filled = 0;

    if (reveal && "IntersectionObserver" in window) {
      var markers = [];
      for (var i = 1; i <= STEPS; i++) {
        var m = document.createElement("div");
        m.className = "pour__marker";
        m.style.top = (i / STEPS) * 100 + "%";
        m.dataset.step = String(i);
        pour.appendChild(m);
        markers.push(m);
      }
      var pourIO = new IntersectionObserver(
        function (entries) {
          var changed = false;
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var step = Number(entry.target.dataset.step);
            if (step > filled) { filled = step; changed = true; }
            pourIO.unobserve(entry.target);
          });
          if (changed) {
            reveal.style.setProperty("--pour-fill", filled / STEPS);
            pour.classList.toggle("is-full", filled >= STEPS);
          }
        },
        /* the pour front runs at 70% of the viewport height */
        { rootMargin: "0px 0px -30% 0px" }
      );
      markers.forEach(function (m) { pourIO.observe(m); });
    } else if (reveal) {
      /* no observer: show the pour in full rather than leaving it blank */
      reveal.style.setProperty("--pour-fill", 1);
      pour.classList.add("is-full");
    }
  }

  /* accessible labels for the applicability matrix cells */
  var levelText = {
    "3": "приоритетная область применения",
    "2": "рекомендовано к применению",
    "1": "возможно в отдельных случаях",
    "0": "не рекомендовано"
  };
  document.querySelectorAll(".matrix td[data-l]").forEach(function (td) {
    var t = levelText[td.getAttribute("data-l")];
    if (t) {
      td.setAttribute("role", "img");
      td.setAttribute("aria-label", t);
    }
  });

  /* contact form -> mailto */
  var form = document.getElementById("contactForm");
  var status = document.getElementById("formStatus");

  function fieldError(input, show) {
    var msg = form.querySelector('.field__error[data-for="' + input.id + '"]');
    input.setAttribute("aria-invalid", show ? "true" : "false");
    if (msg) {
      msg.hidden = !show;
      if (show) input.setAttribute("aria-describedby", msg.id || "");
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.textContent = "";
    status.className = "form-status";

    var name = form.elements.name;
    var phone = form.elements.phone;
    var ok = true;

    if (!name.value.trim()) {
      fieldError(name, true);
      ok = false;
    } else fieldError(name, false);

    if (!phone.value.trim()) {
      fieldError(phone, true);
      ok = false;
    } else fieldError(phone, false);

    if (!ok) {
      status.textContent = "Заполните обязательные поля.";
      status.classList.add("is-err");
      return;
    }

    var company = form.elements.company.value.trim();
    var message = form.elements.message.value.trim();
    var body =
      "Имя: " + name.value.trim() + "\n" +
      (company ? "Компания: " + company + "\n" : "") +
      "Телефон: " + phone.value.trim() + "\n\n" +
      (message ? message : "(без сообщения)");

    var href =
      "mailto:TechflowSolution2024@gmail.com" +
      "?subject=" + encodeURIComponent("Заявка с сайта Techflow Solutions") +
      "&body=" + encodeURIComponent(body);

    status.textContent = "Открываем почтовый клиент. Если письмо не появилось, напишите на TechflowSolution2024@gmail.com";
    status.classList.add("is-ok");
    window.location.href = href;
    form.reset();
  });

  form.addEventListener("input", function (e) {
    if (e.target.getAttribute("aria-invalid") === "true" && e.target.value.trim()) {
      fieldError(e.target, false);
    }
  });
})();
