(function () {

  let isOpen = false;

  function createMessengerUI() {
    const box = document.createElement("div");
    box.id = "ll-chat-box";

    box.innerHTML = `
      <div id="ll-chat-header">
        <b>LinkLedger Support</b>
        <span id="ll-chat-toggle">—</span>
      </div>

      <div id="ll-chat-messages"></div>

      <div id="ll-chat-input-wrap">
        <input id="ll-chat-input" placeholder="Type message..." />
        <button id="ll-chat-send">Send</button>
      </div>
    `;

    document.body.appendChild(box);

    document.getElementById("ll-chat-toggle").onclick = toggleChat;
    document.getElementById("ll-chat-send").onclick = sendMessage;

    loadMessages();
  }

  function createFloatingButton() {
    const btn = document.createElement("div");
    btn.id = "ll-chat-button";
    btn.innerHTML = "💬";
    btn.onclick = toggleChat;

    document.body.appendChild(btn);
  }

  function toggleChat() {
    const box = document.getElementById("ll-chat-box");

    isOpen = !isOpen;

    if (isOpen) {
      box.style.display = "flex";
      loadMessages();
    } else {
      box.style.display = "none";
    }
  }

  async function loadMessages() {
    const r = await fetchJson("/api/messages/mine");

    const box = document.getElementById("ll-chat-messages");
    box.innerHTML = "";

    (r.data || []).forEach(m => {
      const div = document.createElement("div");
      div.className = m.senderRole === "lender" ? "ll-msg me" : "ll-msg admin";
      div.textContent = m.message;
      box.appendChild(div);
    });

    box.scrollTop = box.scrollHeight;
  }

  async function sendMessage() {
    const input = document.getElementById("ll-chat-input");
    const text = input.value.trim();
    if (!text) return;

    await fetchJson("/api/messages/mine", {
      method: "POST",
      body: JSON.stringify({ message: text })
    });

    input.value = "";
    loadMessages();
  }

  document.addEventListener("DOMContentLoaded", function () {
    createFloatingButton();
    createMessengerUI();
  });

})();