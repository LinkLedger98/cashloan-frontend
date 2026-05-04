(function () {

  const API = window.API_BASE_URL || "";

  let lastUnread = 0;
  let audioUnlocked = false;

  // 🔔 Notification sound
  const sound = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
  sound.volume = 0.6;

  function unlockAudio() {
    if (audioUnlocked) return;
    sound.play().then(() => {
      sound.pause();
      sound.currentTime = 0;
      audioUnlocked = true;
    }).catch(() => {});
  }

  document.addEventListener("click", unlockAudio, { once: true });

  function getToken() {
    return localStorage.getItem("authToken") || "";
  }

  async function fetchConversations() {
    try {
      const res = await fetch(API + "/api/admin/messages/conversations", {
        headers: {
          "Authorization": "Bearer " + getToken()
        }
      });

      if (!res.ok) return null;

      return await res.json();

    } catch (e) {
      console.error("Inbox badge fetch error:", e);
      return null;
    }
  }

  function updateUI(unreadTotal) {
    const btn = document.getElementById("adminFloatingInbox");
    const badge = document.getElementById("adminFloatingInboxCount");

    if (!btn || !badge) return;

    if (unreadTotal > 0) {
      badge.textContent = unreadTotal > 99 ? "99+" : unreadTotal;
      badge.style.display = "grid";
      btn.classList.add("has-unread");
    } else {
      badge.style.display = "none";
      btn.classList.remove("has-unread");
    }
  }

  function maybePlaySound(unreadTotal) {
    if (!audioUnlocked) return;

    if (unreadTotal > lastUnread) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }

    lastUnread = unreadTotal;
  }

  async function refreshInbox() {
    const data = await fetchConversations();
    if (!Array.isArray(data)) return;

    const unreadTotal = data.reduce((sum, c) => {
      return sum + Number(c.unreadAdmin || 0);
    }, 0);

    updateUI(unreadTotal);
    maybePlaySound(unreadTotal);
  }

  document.addEventListener("DOMContentLoaded", function () {
    refreshInbox();

    // 🔁 refresh every 10 seconds (feels real-time)
    setInterval(refreshInbox, 10000);
  });

})();