import { config } from "std/dotenv/mod.ts";
import { cleanEnv, str } from "envalid";
import { Application, Router } from "oak";
import { auth } from "twi/mod.ts";

await config({ export: true });

const env = cleanEnv(Deno.env.toObject(), {
  CLIENT_ID: str(),
  CLIENT_SECRET: str(),
});

const app = new Application();
const router = new Router();

const authClient = new auth.OAuth2User({
  client_id: env.CLIENT_ID,
  client_secret: env.CLIENT_SECRET,
  callback: "http://127.0.0.1:3000/callback",
  scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
});

const STATE = "my-state";

router.get("/callback", async (ctx) => {
  try {
    const { code, state } = Object.fromEntries(
      ctx.request.url.searchParams.entries(),
    );
    if (state !== STATE) {
      ctx.response.status = 500;
      ctx.response.body = "State isn't matching";
      return;
    }
    const { token } = await authClient.requestAccessToken(code);
    console.log(JSON.stringify(token));
  } catch (error) {
    console.log(error);
  }
});

router.get("/login", async (ctx) => {
  const authUrl = await authClient.generateAuthURL({
    state: STATE,
    code_challenge_method: "plain",
    code_challenge: "test",
  });
  ctx.response.redirect(authUrl);
});

router.get("/revoke", async (ctx) => {
  try {
    const response = await authClient.revokeAccessToken();
    ctx.response.body = response;
  } catch (error) {
    console.log(error);
  }
});

app.use(router.routes());
console.log(`Go here to login: http://127.0.0.1:3000/login`);
await app.listen({ port: 3000 });
