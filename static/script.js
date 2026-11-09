// Get HTML elements
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const chatArea = document.getElementById("chatArea");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const welcomeScreen = document.getElementById("welcomeScreen");

// Store the current conversation ID
let conversationId = null;

// Display a message in the chat
function addMessage(text, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = sender === "user" ? "S" : "✦";

  const content = document.createElement("div");
  content.className = "message-content";

  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = sender === "user" ? "You" : "ContextAI";

  const messageText = document.createElement("div");
  messageText.className = "message-text";

  // Use textContent to safely display messages
  messageText.textContent = text;

  content.appendChild(label);
  content.appendChild(messageText);

  messageDiv.appendChild(avatar);
  messageDiv.appendChild(content);

  chatArea.appendChild(messageDiv);

  // Scroll to latest message
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Show loading indicator
function showTyping() {
  const typing = document.createElement("div");

  typing.id = "typingIndicator";
  typing.className = "typing";
  typing.textContent = "✦ ContextAI is thinking...";

  chatArea.appendChild(typing);

  chatArea.scrollTop = chatArea.scrollHeight;
}

// Remove loading indicator
function removeTyping() {
  const typing = document.getElementById("typingIndicator");

  if (typing) {
    typing.remove();
  }
}

// Send message to Flask backend
async function sendMessage(message) {
  if (!message.trim()) {
    return;
  }

  // Hide welcome screen
  if (welcomeScreen) {
    welcomeScreen.style.display = "none";
  }

  // Display user's message
  addMessage(message, "user");

  // Clear input
  messageInput.value = "";
  messageInput.style.height = "auto";

  // Disable send button while waiting
  sendBtn.disabled = true;

  showTyping();

  try {
    // Send request to Flask
    const response = await fetch("/chat", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        message: message,
        conversation_id: conversationId,
      }),
    });

    const data = await response.json();

    // Check for backend errors
    if (!response.ok) {
      throw new Error(data.error || "Something went wrong.");
    }

    // Save conversation ID
    conversationId = data.conversation_id;

    // Display AI response
    addMessage(data.response, "assistant");
  } catch (error) {
    console.error("Chat error:", error);

    addMessage(
      "Sorry, I couldn't process your message. " +
        error.message +
        " Please try again.",
      "assistant",
    );
  } finally {
    removeTyping();

    sendBtn.disabled = false;

    messageInput.focus();
  }
}

// Handle form submission
chatForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const message = messageInput.value.trim();

  sendMessage(message);
});

// Send message when Enter is pressed
messageInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();

    chatForm.requestSubmit();
  }
});

// Automatically adjust textarea height
messageInput.addEventListener("input", function () {
  this.style.height = "auto";

  this.style.height = Math.min(this.scrollHeight, 130) + "px";
});

// Handle suggestion buttons
document.querySelectorAll(".suggestion").forEach((button) => {
  button.addEventListener("click", function () {
    const message = this.dataset.message;

    sendMessage(message);
  });
});

// Start a new conversation
newChatBtn.addEventListener("click", function () {
  // Reset conversation ID
  conversationId = null;

  // Remove previous messages
  chatArea.innerHTML = "";

  // Restore welcome screen
  chatArea.appendChild(welcomeScreen);

  welcomeScreen.style.display = "flex";

  // Clear input
  messageInput.value = "";

  messageInput.focus();
});

// Focus on input when page loads
messageInput.focus();
