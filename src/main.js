import { ReactDOM, html } from "./lib.js";
import { App } from "./App.js";

const rootEl = document.getElementById("app");
ReactDOM.createRoot(rootEl).render(html`<${App} />`);
