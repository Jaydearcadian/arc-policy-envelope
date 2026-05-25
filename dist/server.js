import { createServer } from "node:http";
import { handleRequest } from "./api.js";
const port = Number(process.env.PORT ?? 8788);
createServer(handleRequest).listen(port, "127.0.0.1", () => {
    console.log(`Arc Policy Envelope listening on http://127.0.0.1:${port}`);
});
