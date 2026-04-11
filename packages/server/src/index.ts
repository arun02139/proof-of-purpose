import { createApp } from "./app.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

const app = createApp();

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
