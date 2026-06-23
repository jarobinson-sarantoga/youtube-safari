import { enterPanelBoot } from "./boot";
import { initBrowsePanel } from "./browse";
import { initPlayerPanel } from "./player";
import { postToPlugin, waitForIina } from "./messaging";
import { setupViewNav } from "./views";

waitForIina(() => {
  enterPanelBoot();
  setupViewNav();
  initPlayerPanel();
  initBrowsePanel();
  postToPlugin("sidebarReady", {});
});