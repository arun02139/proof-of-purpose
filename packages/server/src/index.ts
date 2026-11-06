import { createApp, type Env } from "./app.js";
import { upgradePending } from "./anchoring.js";

const app = createApp();

export default {
  fetch: app.fetch,
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      upgradePending(env.DB, Date.now()).then(
        (n) => {
          if (n > 0) console.log(`OTS: ${n} submission(s) anchored on Bitcoin`);
        },
        (err) => console.error("OTS upgrade cron failed:", err),
      ),
    );
  },
} satisfies ExportedHandler<Env>;
