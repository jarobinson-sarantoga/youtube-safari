export const backgroundPlayState = {
  hidePending: false,
  backgroundSessionActive: false,
  windowLoadedToken: null as string | null,
  fileLoadedToken: null as string | null,
  deminiaturizedToken: null as string | null,
  movedToken: null as string | null,
  retryTimers: [] as ReturnType<typeof setTimeout>[],
  watchdogTimer: null as ReturnType<typeof setTimeout> | null,
  maintenanceTimer: null as ReturnType<typeof setInterval> | null,
  maintenanceStopTimer: null as ReturnType<typeof setTimeout> | null,
};
