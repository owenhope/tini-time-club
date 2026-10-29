import { initBotId } from "botid/client/core";

initBotId({
  protect: [
    { path: "/business", method: "POST" },
    { path: "/p/*/claim", method: "POST" },
  ],
});
