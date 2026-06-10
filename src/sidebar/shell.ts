import { initBrowsePanel } from "./browse";
import { initPlayerPanel } from "./player";
import { postToPlugin, waitForIina } from "./messaging";
import { setActiveView, setupViewNav } from "./views";

waitForIina(() => {
  setupViewNav();
  initPlayerPanel();
  initBrowsePanel();
  setActiveView("player");
  postToPlugin("sidebarReady", {});
});