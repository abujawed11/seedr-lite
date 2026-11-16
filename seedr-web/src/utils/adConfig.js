// Adsterra ad units. Adsterra rotates its serving domains — if ads stop
// loading (e.g. ERR_SSL_UNRECOGNIZED_NAME_ALERT in the console), open the
// Adsterra dashboard → Websites → Native Banner → GET CODE and update here.

// Native Banner shown on the main page
export const BANNER_AD = {
  scriptUrl: "https://bauval.org/21/f712929b7ed9a7e23f0d1b3b12d2487c",
  containerId: "container-f712929b7ed9a7e23f0d1b3b12d2487c",
};

// Ad shown in the download/play ad gate. Loaded in its own iframe, so it can
// share the banner's unit; set the env vars to use a dedicated unit instead.
export const GATE_AD = {
  scriptUrl: import.meta.env.VITE_AD_GATE_SCRIPT_URL || BANNER_AD.scriptUrl,
  containerId: import.meta.env.VITE_AD_GATE_CONTAINER_ID || BANNER_AD.containerId,
};
