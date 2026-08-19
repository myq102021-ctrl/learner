import { and, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { sourceAssets } from "../../../../db/schema";

export async function GET(request:Request){try{const id=decodeURIComponent(new URL(request.url).pathname.split("/").pop()||"");const uid=request.headers.get("oai-authenticated-user-id")||"local-user";const [asset]=await getDb().select().from(sourceAssets).where(and(eq(sourceAssets.id,id),eq(sourceAssets.userId,uid))).limit(1);if(!asset)return new Response("图片不存在",{status:404});const object=await env.UPLOADS.get(asset.storageKey);if(!object)return new Response("图片文件不存在",{status:404});return new Response(object.body,{headers:{"content-type":asset.mimeType,"cache-control":"private, max-age=3600","content-disposition":`inline; filename="${encodeURIComponent(asset.originalName)}"`}})}catch(error){return new Response(error instanceof Error?error.message:"读取图片失败",{status:500})}}
