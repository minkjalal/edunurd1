/**
 * =============================================================================
 * EduNerd - "Discord-like" Community Real-Time Chat Widget (ag-discord-widget.js)
 * =============================================================================
 * CRITICAL CONSTRAINT COMPLIANCE:
 * - 100% self-contained drop-in module.
 * - ZERO modifications to pre-existing business logic.
 * - Mounts inside <div id="ag-discord-mount"></div> or <ag-discord-chat></ag-discord-chat>.
 * - All CSS classes strictly prefixed with 'ag-chat-*' to guarantee zero style collisions.
 * - Reads existing JWT session token passively from localStorage without modifying auth controllers.
 * =============================================================================
 */

(function (window, document) {
  "use strict";

  // Prevent multiple executions
  if (window.AgDiscordChat) return;

  // ── 1. CONFIGURATION & STATE ──
  const DEFAULT_WS_URL = (location.protocol === "https:" ? "wss://" : "ws://") + location.hostname + ":3001/ws/chat";
  const DEFAULT_HTTP_URL = (location.protocol === "https:" ? "https://" : "http://") + location.hostname + ":3001";

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(str) {
    return String(str || "").replace(/[<>&"]/g, (c) => ({
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;"
    })[c]);
  }

  /**
   * Markdown parser for message content
   * Supports: **bold**, *italic*, ~~strikethrough~~, `code`, ```codeblocks```, and links
   */
  function parseMarkdown(text) {
    if (!text) return "";
    let safe = escapeHtml(text);

    // Multi-line codeblocks: ```code```
    safe = safe.replace(/```([\s\S]*?)```/g, '<pre class="ag-chat-codeblock"><code>$1</code></pre>');

    // Inline code: `code`
    safe = safe.replace(/`([^`]+)`/g, '<code class="ag-chat-inline-code">$1</code>');

    // Bold: **text**
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong class="ag-chat-bold">$1</strong>');

    // Italic: *text* or _text_
    safe = safe.replace(/\*([^*]+)\*/g, '<em class="ag-chat-italic">$1</em>');
    safe = safe.replace(/_([^_]+)_/g, '<em class="ag-chat-italic">$1</em>');

    // Strikethrough: ~~text~~
    safe = safe.replace(/~~([^~]+)~~/g, '<del class="ag-chat-strike">$1</del>');

    // Mentions: @username
    safe = safe.replace(/@([a-zA-Z0-9_\-]+)/g, '<span class="ag-chat-mention">@$1</span>');

    // URLs to clickable links
    safe = safe.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="ag-chat-link">$1</a>');

    // Newlines to <br>
    safe = safe.replace(/\n/g, "<br>");

    return safe;
  }

  /**
   * Relative / formatted timestamp
   */
  function formatTimestamp(ts) {
    const d = new Date(ts);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (isToday) return `Today at ${timeStr}`;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`;
  }

  /**
   * Deterministic avatar color based on name string
   */
  function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) % 360;
    }
    return `hsl(${hash}, 65%, 48%)`;
  }

  // ── 2. ISOLATED CSS STYLES (Prefixed with ag-chat-*) ──
  const CSS_STYLES = `
    .ag-chat-wrapper {
      display: flex;
      width: 100%;
      height: 680px;
      max-height: 85vh;
      background: #1e1f22;
      border: 1px solid #2b2d31;
      border-radius: 16px;
      overflow: hidden;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #dbdee1;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
      position: relative;
      box-sizing: border-box;
    }

    .ag-chat-wrapper *, .ag-chat-wrapper *::before, .ag-chat-wrapper *::after {
      box-sizing: border-box;
    }

    /* ── LEFT SIDEBAR: CHANNELS ── */
    .ag-chat-sidebar-left {
      width: 240px;
      flex-shrink: 0;
      background: #2b2d31;
      display: flex;
      flex-direction: column;
      border-right: 1px solid #1f2023;
    }

    .ag-chat-server-header {
      padding: 16px;
      font-weight: 700;
      font-size: 15px;
      color: #f2f3f5;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #1f2023;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .ag-chat-channels-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #949ba4;
      padding: 16px 14px 6px;
      letter-spacing: 0.05em;
    }

    .ag-chat-channels-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 8px;
    }

    .ag-chat-channel-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      margin-bottom: 2px;
      border-radius: 6px;
      color: #949ba4;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      user-select: none;
    }

    .ag-chat-channel-item:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #dbdee1;
    }

    .ag-chat-channel-item.ag-chat-channel-active {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      font-weight: 600;
    }

    .ag-chat-channel-hash {
      font-size: 18px;
      font-weight: 400;
      color: #80848e;
      line-height: 1;
    }

    .ag-chat-user-panel {
      padding: 10px 12px;
      background: #232428;
      display: flex;
      align-items: center;
      gap: 10px;
      border-top: 1px solid #1f2023;
    }

    .ag-chat-avatar-wrap {
      position: relative;
      flex-shrink: 0;
    }

    .ag-chat-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      color: #fff;
    }

    .ag-chat-status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #23a55a;
      border: 2px solid #232428;
      position: absolute;
      bottom: -1px;
      right: -1px;
    }

    .ag-chat-status-dot.ag-chat-offline {
      background: #80848e;
    }

    .ag-chat-user-info {
      flex: 1;
      min-width: 0;
    }

    .ag-chat-user-name {
      font-size: 13px;
      font-weight: 600;
      color: #f2f3f5;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ag-chat-user-tag {
      font-size: 11px;
      color: #949ba4;
    }

    /* ── CENTER: MAIN CHAT AREA ── */
    .ag-chat-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #313338;
      min-width: 0;
    }

    .ag-chat-header {
      height: 52px;
      padding: 0 18px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid #232428;
      background: #313338;
      flex-shrink: 0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .ag-chat-header-title {
      font-size: 16px;
      font-weight: 700;
      color: #f2f3f5;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .ag-chat-header-divider {
      width: 1px;
      height: 18px;
      background: #4e5058;
      margin: 0 6px;
    }

    .ag-chat-header-topic {
      font-size: 13px;
      color: #949ba4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .ag-chat-messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ag-chat-message-row {
      display: flex;
      gap: 14px;
      padding: 4px 6px;
      border-radius: 6px;
      transition: background 0.1s;
    }

    .ag-chat-message-row:hover {
      background: rgba(0, 0, 0, 0.07);
    }

    .ag-chat-message-body {
      flex: 1;
      min-width: 0;
    }

    .ag-chat-message-meta {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 4px;
    }

    .ag-chat-author-name {
      font-size: 14px;
      font-weight: 600;
      color: #f2f3f5;
      cursor: pointer;
    }

    .ag-chat-author-name:hover {
      text-decoration: underline;
    }

    .ag-chat-author-badge {
      font-size: 10px;
      padding: 2px 5px;
      border-radius: 4px;
      background: #5865f2;
      color: #fff;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .ag-chat-timestamp {
      font-size: 11px;
      color: #949ba4;
    }

    .ag-chat-message-text {
      font-size: 14px;
      line-height: 1.45;
      color: #dbdee1;
      word-break: break-word;
    }

    .ag-chat-bold { font-weight: 700; color: #fff; }
    .ag-chat-italic { font-style: italic; }
    .ag-chat-strike { text-decoration: line-through; opacity: 0.7; }
    
    .ag-chat-inline-code {
      background: #1e1f22;
      padding: 2px 5px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      color: #e0e1e5;
    }

    .ag-chat-codeblock {
      background: #1e1f22;
      border: 1px solid #2b2d31;
      padding: 10px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 12px;
      overflow-x: auto;
      margin: 6px 0;
    }

    .ag-chat-mention {
      background: rgba(88, 101, 242, 0.3);
      color: #c9cdfb;
      padding: 1px 4px;
      border-radius: 3px;
      font-weight: 500;
    }

    .ag-chat-link {
      color: #00a8fc;
      text-decoration: none;
    }
    .ag-chat-link:hover {
      text-decoration: underline;
    }

    /* ── TYPING INDICATOR BAR ── */
    .ag-chat-typing-bar {
      height: 22px;
      padding: 0 18px;
      font-size: 12px;
      color: #949ba4;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .ag-chat-typing-dots {
      display: inline-flex;
      gap: 3px;
    }
    .ag-chat-typing-dots span {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #949ba4;
      animation: agChatDotPulse 1.2s infinite ease-in-out;
    }
    .ag-chat-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .ag-chat-typing-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes agChatDotPulse {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1.1); opacity: 1; }
    }

    /* ── INPUT BOX ── */
    .ag-chat-input-container {
      padding: 0 16px 18px;
      position: relative;
      flex-shrink: 0;
    }

    .ag-chat-input-box {
      background: #383a40;
      border-radius: 8px;
      display: flex;
      align-items: center;
      padding: 2px 14px;
      gap: 10px;
    }

    .ag-chat-input {
      flex: 1;
      background: transparent;
      border: 0;
      outline: none;
      color: #dbdee1;
      font-size: 14px;
      padding: 11px 0;
      font-family: inherit;
    }

    .ag-chat-input::placeholder {
      color: #80848e;
    }

    .ag-chat-send-btn {
      background: #5865f2;
      border: 0;
      color: #fff;
      border-radius: 6px;
      padding: 7px 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: background 0.15s;
    }

    .ag-chat-send-btn:hover {
      background: #4752c4;
    }

    /* ── RIGHT SIDEBAR: PRESENCE ── */
    .ag-chat-sidebar-right {
      width: 200px;
      flex-shrink: 0;
      background: #2b2d31;
      border-left: 1px solid #1f2023;
      display: flex;
      flex-direction: column;
    }

    .ag-chat-members-section {
      padding: 16px 12px 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #949ba4;
      letter-spacing: 0.05em;
    }

    .ag-chat-members-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 8px;
    }

    .ag-chat-member-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      border-radius: 6px;
      margin-bottom: 2px;
      cursor: pointer;
      transition: background 0.1s;
    }

    .ag-chat-member-row:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    .ag-chat-member-name {
      font-size: 13px;
      font-weight: 500;
      color: #949ba4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ag-chat-member-row:hover .ag-chat-member-name {
      color: #f2f3f5;
    }

    /* Responsive collapsible sidebar controls */
    @media (max-width: 768px) {
      .ag-chat-sidebar-right { display: none; }
      .ag-chat-sidebar-left { width: 180px; }
    }
  `;

  // Inject CSS once into <head>
  function injectStyles() {
    if (!document.getElementById("ag-chat-styles")) {
      const styleEl = document.createElement("style");
      styleEl.id = "ag-chat-styles";
      styleEl.textContent = CSS_STYLES;
      document.head.append(styleEl);
    }
  }

  // ── 3. MAIN WIDGET CONTROLLER CLASS ──
  class AgDiscordChatWidget {
    constructor(mountElement, options = {}) {
      this.container = typeof mountElement === "string" ? document.querySelector(mountElement) : mountElement;
      if (!this.container) {
        console.warn("AgDiscordChat: Mount target element not found.");
        return;
      }

      this.wsUrl = options.wsUrl || DEFAULT_WS_URL;
      this.httpUrl = options.httpUrl || DEFAULT_HTTP_URL;

      // Extract existing session passively from localStorage
      this.token = localStorage.getItem("en_token") || "";
      this.uid = localStorage.getItem("en_uid") || "";

      let savedProgressName = "Student";
      try {
        const sp = JSON.parse(localStorage.getItem("sp") || "{}");
        if (sp.name) savedProgressName = sp.name;
      } catch {}
      this.userName = options.userName || savedProgressName;

      // State
      this.ws = null;
      this.channels = [];
      this.activeChannelId = "chan_general";
      this.messages = [];
      this.members = [];
      this.typingUsers = new Map(); // userId -> { userName, timeout }
      this.isReconnecting = false;
      this.typingDebounce = null;

      injectStyles();
      this.initLayout();
      this.connectWebSocket();
    }

    initLayout() {
      this.container.innerHTML = `
        <div class="ag-chat-wrapper">
          <!-- LEFT: CHANNELS SIDEBAR -->
          <div class="ag-chat-sidebar-left">
            <div class="ag-chat-server-header">
              <span>🎓 EduNerd Community</span>
              <span style="font-size:12px">✨</span>
            </div>
            <div class="ag-chat-channels-label">Text Channels</div>
            <div class="ag-chat-channels-list" id="ag_channels_list"></div>

            <div class="ag-chat-user-panel">
              <div class="ag-chat-avatar-wrap">
                <div class="ag-chat-avatar" style="background:${getAvatarColor(this.userName)}">
                  ${(this.userName || "?")[0].toUpperCase()}
                </div>
                <div class="ag-chat-status-dot"></div>
              </div>
              <div class="ag-chat-user-info">
                <div class="ag-chat-user-name">${escapeHtml(this.userName)}</div>
                <div class="ag-chat-user-tag">${this.token ? "Signed In" : "Guest"}</div>
              </div>
            </div>
          </div>

          <!-- CENTER: ACTIVE CHAT -->
          <div class="ag-chat-main">
            <div class="ag-chat-header">
              <div class="ag-chat-header-title">
                <span class="ag-chat-channel-hash">#</span>
                <span id="ag_channel_title">general</span>
              </div>
              <div class="ag-chat-header-divider"></div>
              <div class="ag-chat-header-topic" id="ag_channel_topic">General discussions</div>
            </div>

            <div class="ag-chat-messages-container" id="ag_messages_box"></div>

            <div class="ag-chat-typing-bar" id="ag_typing_bar"></div>

            <div class="ag-chat-input-container">
              <div class="ag-chat-input-box">
                <input
                  type="text"
                  id="ag_chat_input"
                  class="ag-chat-input"
                  placeholder="Message #general"
                  autocomplete="off"
                />
                <button id="ag_send_btn" class="ag-chat-send-btn">Send</button>
              </div>
            </div>
          </div>

          <!-- RIGHT: MEMBERS PRESENCE -->
          <div class="ag-chat-sidebar-right">
            <div class="ag-chat-members-section" id="ag_online_count">Online — 0</div>
            <div class="ag-chat-members-list" id="ag_members_list"></div>
          </div>
        </div>
      `;

      // Cache DOM references
      this.dom = {
        channelsList: this.container.querySelector("#ag_channels_list"),
        channelTitle: this.container.querySelector("#ag_channel_title"),
        channelTopic: this.container.querySelector("#ag_channel_topic"),
        messagesBox: this.container.querySelector("#ag_messages_box"),
        typingBar: this.container.querySelector("#ag_typing_bar"),
        chatInput: this.container.querySelector("#ag_chat_input"),
        sendBtn: this.container.querySelector("#ag_send_btn"),
        membersList: this.container.querySelector("#ag_members_list"),
        onlineCount: this.container.querySelector("#ag_online_count")
      };

      // Wire Send button & Enter key
      this.dom.sendBtn.onclick = () => this.handleSendMessage();
      this.dom.chatInput.onkeydown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        } else {
          this.emitTyping();
        }
      };
    }

    connectWebSocket() {
      const socketUrl = `${this.wsUrl}?token=${encodeURIComponent(this.token)}&userName=${encodeURIComponent(this.userName)}`;

      try {
        this.ws = new WebSocket(socketUrl);

        this.ws.onopen = () => {
          this.isReconnecting = false;
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
          } catch (err) {
            console.warn("AgDiscordChat: Message parse error", err);
          }
        };

        this.ws.onclose = () => {
          this.scheduleReconnect();
        };

        this.ws.onerror = () => {
          this.scheduleReconnect();
        };
      } catch (e) {
        this.scheduleReconnect();
      }
    }

    scheduleReconnect() {
      if (this.isReconnecting) return;
      this.isReconnecting = true;
      setTimeout(() => {
        this.connectWebSocket();
      }, 3500);
    }

    handleServerMessage(data) {
      if (data.type === "ready") {
        this.channels = data.channels || [];
        this.activeChannelId = data.activeChannel || "chan_general";
        this.messages = data.history || [];
        this.renderChannels();
        this.renderMessages();
      }

      if (data.type === "channel_joined") {
        this.activeChannelId = data.channelId;
        this.messages = data.history || [];
        this.renderChannels();
        this.renderMessages();
      }

      if (data.type === "new_message") {
        if (data.message.channelId === this.activeChannelId) {
          this.messages.push(data.message);
          this.appendMessage(data.message);
        }
      }

      if (data.type === "user_typing") {
        if (data.channelId === this.activeChannelId && data.userId !== this.uid) {
          this.registerUserTyping(data.userId, data.userName);
        }
      }

      if (data.type === "presence_sync") {
        this.members = data.members || [];
        this.renderPresence();
      }
    }

    renderChannels() {
      this.dom.channelsList.innerHTML = this.channels.map((chan) => {
        const isActive = chan.id === this.activeChannelId;
        return `
          <div class="ag-chat-channel-item ${isActive ? "ag-chat-channel-active" : ""}" data-chanid="${chan.id}">
            <span class="ag-chat-channel-hash">#</span>
            <span>${escapeHtml(chan.name)}</span>
          </div>
        `;
      }).join("");

      // Update Header
      const activeChan = this.channels.find(c => c.id === this.activeChannelId);
      if (activeChan) {
        this.dom.channelTitle.textContent = activeChan.name;
        this.dom.channelTopic.textContent = activeChan.topic || "Discussion channel";
        this.dom.chatInput.placeholder = `Message #${activeChan.name}`;
      }

      // Wire channel selection
      this.dom.channelsList.querySelectorAll("[data-chanid]").forEach(el => {
        el.onclick = () => {
          const chanId = el.dataset.chanid;
          if (chanId !== this.activeChannelId) {
            this.switchChannel(chanId);
          }
        };
      });
    }

    switchChannel(channelId) {
      this.activeChannelId = channelId;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "join_channel", channelId }));
      }
    }

    renderMessages() {
      this.dom.messagesBox.innerHTML = "";
      this.messages.forEach(msg => this.appendMessage(msg));
      this.scrollToBottom();
    }

    appendMessage(msg) {
      const row = document.createElement("div");
      row.className = "ag-chat-message-row";

      const isBot = msg.userId === "system";
      const isTutor = msg.userName.toLowerCase().includes("tutor");
      const badge = isBot ? "BOT" : isTutor ? "TUTOR" : "";

      row.innerHTML = `
        <div class="ag-chat-avatar" style="background:${getAvatarColor(msg.userName)}">
          ${(msg.userName || "?")[0].toUpperCase()}
        </div>
        <div class="ag-chat-message-body">
          <div class="ag-chat-message-meta">
            <span class="ag-chat-author-name">${escapeHtml(msg.userName)}</span>
            ${badge ? `<span class="ag-chat-author-badge">${badge}</span>` : ""}
            <span class="ag-chat-timestamp">${formatTimestamp(msg.createdAt)}</span>
          </div>
          <div class="ag-chat-message-text">${parseMarkdown(msg.content)}</div>
        </div>
      `;

      this.dom.messagesBox.append(row);
      this.scrollToBottom();
    }

    scrollToBottom() {
      this.dom.messagesBox.scrollTop = this.dom.messagesBox.scrollHeight;
    }

    handleSendMessage() {
      const input = this.dom.chatInput;
      const text = input.value.trim();
      if (!text) return;

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: "send_message",
          content: text
        }));
        input.value = "";
      }
    }

    emitTyping() {
      if (this.typingDebounce) return;
      this.typingDebounce = setTimeout(() => {
        this.typingDebounce = null;
      }, 2000);

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "typing" }));
      }
    }

    registerUserTyping(userId, userName) {
      if (this.typingUsers.has(userId)) {
        clearTimeout(this.typingUsers.get(userId).timeout);
      }

      const timeout = setTimeout(() => {
        this.typingUsers.delete(userId);
        this.renderTypingIndicator();
      }, 3000);

      this.typingUsers.set(userId, { userName, timeout });
      this.renderTypingIndicator();
    }

    renderTypingIndicator() {
      const names = Array.from(this.typingUsers.values()).map(u => u.userName);
      if (!names.length) {
        this.dom.typingBar.innerHTML = "";
        return;
      }

      const text = names.length === 1
        ? `<b>${escapeHtml(names[0])}</b> is typing`
        : names.length === 2
          ? `<b>${escapeHtml(names[0])}</b> and <b>${escapeHtml(names[1])}</b> are typing`
          : `Several students are typing`;

      this.dom.typingBar.innerHTML = `
        <div class="ag-chat-typing-dots"><span></span><span></span><span></span></div>
        <span>${text}…</span>
      `;
    }

    renderPresence() {
      this.dom.onlineCount.textContent = `Online — ${this.members.length}`;
      this.dom.membersList.innerHTML = this.members.map((member) => `
        <div class="ag-chat-member-row">
          <div class="ag-chat-avatar-wrap">
            <div class="ag-chat-avatar" style="width:28px;height:28px;font-size:12px;background:${getAvatarColor(member.userName)}">
              ${(member.userName || "?")[0].toUpperCase()}
            </div>
            <div class="ag-chat-status-dot"></div>
          </div>
          <div class="ag-chat-member-name">${escapeHtml(member.userName)}</div>
        </div>
      `).join("") || '<div class="ag-chat-user-tag" style="padding:10px">No members online</div>';
    }
  }

  // ── 4. AUTO-MOUNT & PUBLIC API ──
  window.AgDiscordChat = {
    mount(targetSelectorOrElement = "#ag-discord-mount", options = {}) {
      return new AgDiscordChatWidget(targetSelectorOrElement, options);
    }
  };

  // Define Web Component <ag-discord-chat> for declarative drop-in
  if (typeof customElements !== "undefined" && !customElements.get("ag-discord-chat")) {
    customElements.define("ag-discord-chat", class extends HTMLElement {
      connectedCallback() {
        window.AgDiscordChat.mount(this);
      }
    });
  }

  // Auto-mount if target container is already present in DOM
  document.addEventListener("DOMContentLoaded", () => {
    const defaultMount = document.getElementById("ag-discord-mount");
    if (defaultMount) {
      window.AgDiscordChat.mount(defaultMount);
    }
  });

})(window, document);
