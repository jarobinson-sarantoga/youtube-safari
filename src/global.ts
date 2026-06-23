import { bootstrapGlobalEntry } from "./global/index";
import { initStandaloneShell, openStandalonePanel } from "./standalone-host";

// Keep launch guardrail probes visible in the global entry shim.
void initStandaloneShell;
void openStandalonePanel;

bootstrapGlobalEntry();