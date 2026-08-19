import { and, asc, eq, inArray } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { learningCards, learningCardTags, memoryStates, reviewEvents, sourceAssets, tags, users } from "../../../db/schema";

function identity(request:Request){return {id:request.headers.get("oai-authenticated-user-id")||"local-user",email:request.headers.get("oai-authenticated-user-email")||"local@learner.app"}}
function normalize(value:string){return value.trim().replace(/\s+/g," ").toLocaleLowerCase()}
async function ensureUser(request:Request){const user=identity(request);await getDb().insert(users).values({id:user.id,email:user.email,name:null,timezone:"Asia/Shanghai",createdAt:new Date(),updatedAt:new Date()}).onConflictDoNothing();return user.id}
function parseDetail(value:string|null){try{return value?JSON.parse(value):null}catch{return null}}
function cleanFront(value:string){const lines=value.split("\n").map(line=>line.trim()).filter(Boolean);for(let size=Math.floor(lines.length/2);size>0;size--){const tail=lines.slice(-size);const previous=lines.slice(-size*2,-size);if(tail.length===previous.length&&tail.every((line,index)=>line===previous[index]))return lines.slice(0,-size).join("\n")}return value}

export async function GET(request:Request){
  try{
    const uid=await ensureUser(request);const db=getDb();const rows=await db.select().from(learningCards).where(eq(learningCards.userId,uid)).orderBy(asc(learningCards.createdAt));
    if(!rows.length)return Response.json({cards:[]});
    const links=await db.select({cardId:learningCardTags.learningCardId,name:tags.name}).from(learningCardTags).innerJoin(tags,eq(tags.id,learningCardTags.tagId)).where(inArray(learningCardTags.learningCardId,rows.map(row=>row.id)));
    return Response.json({cards:rows.map(row=>({id:row.id,type:row.cardType==="question"?"原题":"知识点",front:cleanFront(row.front),back:row.back,path:"AI 解析 / 待归类",tags:links.filter(link=>link.cardId===row.id).map(link=>link.name),interval:"新卡片",tone:"orange",sourceUrl:row.sourceAssetId?`/api/assets/${row.sourceAssetId}`:null,detail:parseDetail(row.explanation)}))});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"读取卡片失败"},{status:500})}
}

export async function POST(request:Request){
  try{
    const uid=await ensureUser(request);const body=await request.json();if(!Array.isArray(body.cards)||!body.cards.length)return Response.json({error:"没有可保存的卡片"},{status:400});const db=getDb();const now=new Date();let sourceAssetId:string|null=null;
    if(typeof body.sourceImage==="string"){
      const match=body.sourceImage.match(/^data:(image\/[^;]+);base64,(.+)$/);if(match){const bytes=Uint8Array.from(atob(match[2]),char=>char.charCodeAt(0));sourceAssetId=crypto.randomUUID();const extension=match[1].split("/")[1]||"png";const storageKey=`users/${uid}/sources/${sourceAssetId}.${extension}`;await env.UPLOADS.put(storageKey,bytes,{httpMetadata:{contentType:match[1]}});await db.insert(sourceAssets).values({id:sourceAssetId,userId:uid,storageKey,originalName:String(body.sourceName||`source.${extension}`),mimeType:match[1],size:bytes.byteLength,width:null,height:null,checksum:null,status:"ready",createdAt:now,updatedAt:now})}
    }
    const created=[];
    for(const input of body.cards){
      const detail={stem:String(input.stem||""),options:Array.isArray(input.options)?input.options.map(String):[],answer:String(input.answer||""),solution:String(input.solution||""),thinkingModel:input.thinkingModel||null};
      const card={id:crypto.randomUUID(),userId:uid,cardType:"question" as const,front:String(input.front||""),back:String(input.back||""),explanation:JSON.stringify(detail),sourceAssetId,directoryId:null,status:"active" as const,archivedAt:null,createdAt:now,updatedAt:now};await db.insert(learningCards).values(card);
      const uniqueNames=[...new Map((Array.isArray(input.tags)?input.tags:[]).map((raw:unknown)=>{const name=String(raw).trim().replace(/\s+/g," ");return [normalize(name),name]}).filter(([key])=>key)).entries()];
      for(const [normalizedName,name] of uniqueNames){let [tag]=await db.select({id:tags.id,name:tags.name}).from(tags).where(and(eq(tags.userId,uid),eq(tags.normalizedName,normalizedName))).limit(1);if(!tag){const id=crypto.randomUUID();await db.insert(tags).values({id,userId:uid,name,normalizedName,createdAt:now,updatedAt:now}).onConflictDoNothing();[tag]=await db.select({id:tags.id,name:tags.name}).from(tags).where(and(eq(tags.userId,uid),eq(tags.normalizedName,normalizedName))).limit(1)}if(tag)await db.insert(learningCardTags).values({learningCardId:card.id,tagId:tag.id}).onConflictDoNothing()}
      created.push({id:card.id,type:"原题",front:card.front,back:card.back,path:"AI 解析 / 待归类",tags:uniqueNames.map(([,name])=>name),interval:"新卡片",tone:"orange",sourceUrl:sourceAssetId?`/api/assets/${sourceAssetId}`:null,detail});
    }
    return Response.json({cards:created},{status:201});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"保存卡片失败"},{status:500})}
}

export async function DELETE(request:Request){
  try{
    const uid=await ensureUser(request);const id=new URL(request.url).searchParams.get("id");if(!id)return Response.json({error:"缺少卡片 id"},{status:400});const db=getDb();const [card]=await db.select({id:learningCards.id,sourceAssetId:learningCards.sourceAssetId}).from(learningCards).where(and(eq(learningCards.id,id),eq(learningCards.userId,uid))).limit(1);if(!card)return Response.json({error:"卡片不存在"},{status:404});
    await db.delete(reviewEvents).where(and(eq(reviewEvents.learningCardId,id),eq(reviewEvents.userId,uid)));await db.delete(memoryStates).where(and(eq(memoryStates.learningCardId,id),eq(memoryStates.userId,uid)));await db.delete(learningCardTags).where(eq(learningCardTags.learningCardId,id));await db.delete(learningCards).where(and(eq(learningCards.id,id),eq(learningCards.userId,uid)));
    let sourceDeleted=false;if(card.sourceAssetId){const [remaining]=await db.select({id:learningCards.id}).from(learningCards).where(eq(learningCards.sourceAssetId,card.sourceAssetId)).limit(1);if(!remaining){const [asset]=await db.select().from(sourceAssets).where(and(eq(sourceAssets.id,card.sourceAssetId),eq(sourceAssets.userId,uid))).limit(1);if(asset){await env.UPLOADS.delete(asset.storageKey);await db.delete(sourceAssets).where(and(eq(sourceAssets.id,asset.id),eq(sourceAssets.userId,uid)));sourceDeleted=true}}}
    return Response.json({ok:true,sourceDeleted});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"删除卡片失败"},{status:500})}
}
