import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const fetchImageAsDataUrl = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ url: z.string().url().max(2000) }).parse(data))
  .handler(async ({ data }) => {
    const res = await fetch(data.url, {
      headers: { "User-Agent": "Mozilla/5.0 LawExpertBot" },
    });
    if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) throw new Error("URL is not an image");
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > 10 * 1024 * 1024) throw new Error("Image too large (>10 MB)");
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    return { dataUrl: `data:${contentType};base64,${b64}` };
  });
