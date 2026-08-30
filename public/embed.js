/**
 * RelayOS embed script.
 *
 * Usage (paste before </body> on the client's website):
 *   <script src="https://your-relayos-domain.vercel.app/embed.js" data-widget-key="THEIR_PUBLIC_KEY"></script>
 *
 * This intentionally stays dependency-free vanilla JS so it can be
 * dropped into ANY site regardless of what that site is built with.
 */
(function () {
  var scriptTag = document.currentScript;
  var widgetKey = scriptTag.getAttribute("data-widget-key");
  var origin = new URL(scriptTag.src).origin;

  if (!widgetKey) {
    console.error("[RelayOS] Missing data-widget-key on the embed script tag.");
    return;
  }

  var bubbleSize = 60;
  var panelWidth = 380;
  var panelHeight = 560;

  var bubble = document.createElement("button");
  bubble.setAttribute("aria-label", "Open chat");
  bubble.innerHTML =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  bubble.style.cssText =
    "position:fixed;bottom:20px;right:20px;width:" +
    bubbleSize +
    "px;height:" +
    bubbleSize +
    "px;border-radius:9999px;background:#12151C;border:none;cursor:pointer;" +
    "box-shadow:0 8px 24px rgba(18,21,28,0.25);display:flex;align-items:center;justify-content:center;" +
    "z-index:2147483000;transition:transform 0.15s ease;";
  bubble.onmouseenter = function () { bubble.style.transform = "scale(1.06)"; };
  bubble.onmouseleave = function () { bubble.style.transform = "scale(1)"; };

  var frame = document.createElement("iframe");
  frame.src = origin + "/widget/" + widgetKey;
  frame.title = "RelayOS chat";
  frame.style.cssText =
    "position:fixed;bottom:" +
    (bubbleSize + 32) +
    "px;right:20px;width:" +
    panelWidth +
    "px;height:" +
    panelHeight +
    "px;max-width:calc(100vw - 32px);max-height:calc(100vh - 120px);border:none;border-radius:16px;" +
    "box-shadow:0 16px 48px rgba(18,21,28,0.28);z-index:2147483000;display:none;background:transparent;";

  var open = false;
  function toggle() {
    open = !open;
    frame.style.display = open ? "block" : "none";
  }
  bubble.addEventListener("click", toggle);

  document.body.appendChild(frame);
  document.body.appendChild(bubble);
})();
