import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { cardGenerationBatches, learningCards, learningCardTags, memoryStates, reviewEvents, sourceAssets, tags, users } from "../../../db/schema";

function identity(request:Request){return {id:request.headers.get("oai-authenticated-user-id")||"local-user",email:request.headers.get("oai-authenticated-user-email")||"local@learner.app"}}
function normalize(value:string){return value.trim().replace(/\s+/g," ").toLocaleLowerCase()}
async function ensureUser(request:Request){const user=identity(request);await (await getDb()).insert(users).values({id:user.id,email:user.email,name:null,timezone:"Asia/Shanghai",createdAt:new Date(),updatedAt:new Date()}).onConflictDoNothing();return user.id}
function parseDetail(value:string|null){try{return value?JSON.parse(value):null}catch{return null}}
function cleanFront(value:string){const lines=value.split("\n").map(line=>line.trim()).filter(Boolean);for(let size=Math.floor(lines.length/2);size>0;size--){const tail=lines.slice(-size);const previous=lines.slice(-size*2,-size);if(tail.length===previous.length&&tail.every((line,index)=>line===previous[index]))return lines.slice(0,-size).join("\n")}return value}

export async function GET(request:Request){
  try{
    const uid=await ensureUser(request);const db=(await getDb());const rows=await db.select().from(learningCards).where(eq(learningCards.userId,uid)).orderBy(desc(learningCards.createdAt));
    const tagRowsPromise=db.select({id:tags.id,name:tags.name}).from(tags).where(eq(tags.userId,uid)).orderBy(asc(tags.name));
    if(!rows.length){const tagRows=await tagRowsPromise;return Response.json({cards:[],tags:tagRows.map(tag=>({...tag,count:0}))})}
    const cardIds=rows.map(row=>row.id);
    const [links,states,tagRows]=await Promise.all([
      db.select({cardId:learningCardTags.learningCardId,tagId:learningCardTags.tagId,name:tags.name}).from(learningCardTags).innerJoin(tags,eq(tags.id,learningCardTags.tagId)).where(inArray(learningCardTags.learningCardId,cardIds)),
      db.select().from(memoryStates).where(and(eq(memoryStates.userId,uid),inArray(memoryStates.learningCardId,cardIds))),
      tagRowsPromise,
    ]);
    const tagsByCard=new Map<string,string[]>();const tagCounts=new Map<string,number>();const statesByCard=new Map(states.map(state=>[state.learningCardId,state]));
    for(const link of links){const names=tagsByCard.get(link.cardId)||[];names.push(link.name);tagsByCard.set(link.cardId,names);tagCounts.set(link.tagId,(tagCounts.get(link.tagId)||0)+1)}
    return Response.json({cards:rows.map(row=>{const state=statesByCard.get(row.id);return {id:row.id,type:row.cardType==="question"?"原题":row.cardType==="memorization"?"背诵":"知识点",front:cleanFront(row.front),back:row.back,personalNote:row.personalNote||"",path:"AI 解析 / 待归类",tags:tagsByCard.get(row.id)||[],interval:state?`${state.currentIntervalDays} 天`:"新卡片",tone:"orange",createdAt:row.createdAt,lastReviewAt:state?.lastReviewAt||null,nextReviewAt:state?.nextReviewAt||null,memoryStatus:state?.status||"new",sourceUrl:row.sourceAssetId?`/api/assets/${row.sourceAssetId}`:null,detail:parseDetail(row.explanation)}}),tags:tagRows.map(tag=>({...tag,count:tagCounts.get(tag.id)||0}))});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"读取卡片失败"},{status:500})}
}

export async function POST(request:Request){
  let batchId="";let db:Awaited<ReturnType<typeof getDb>>|null=null;
  try{
    const uid=await ensureUser(request);const body=await request.json();if(!Array.isArray(body.cards)||!body.cards.length)return Response.json({error:"没有可保存的卡片"},{status:400});const generationKey=String(body.generationKey||"").trim();if(!generationKey)return Response.json({error:"缺少生成批次标识"},{status:400});db=await getDb();const now=new Date();batchId=crypto.randomUUID();await db.insert(cardGenerationBatches).values({id:batchId,userId:uid,generationKey,status:"pending",responseJson:null,createdAt:now,updatedAt:now}).onConflictDoNothing();const [batch]=await db.select().from(cardGenerationBatches).where(and(eq(cardGenerationBatches.userId,uid),eq(cardGenerationBatches.generationKey,generationKey))).limit(1);if(batch?.id!==batchId){if(batch?.status==="completed"&&batch.responseJson)return Response.json(JSON.parse(batch.responseJson),{status:200});return Response.json({error:"这批卡片正在生成，请勿重复提交",pending:true},{status:409})}let sourceAssetId:string|null=null;
    if(typeof body.sourceImage==="string"){
      const match=body.sourceImage.match(/^data:(image\/[^;]+);base64,(.+)$/);if(match){const bytes=Uint8Array.from(atob(match[2]),char=>char.charCodeAt(0));sourceAssetId=crypto.randomUUID();const extension=match[1].split("/")[1]||"png";const storageKey=`users/${uid}/sources/${sourceAssetId}.${extension}`;await env.UPLOADS.put(storageKey,bytes,{httpMetadata:{contentType:match[1]},customMetadata:{optimized:match[1]==="image/webp"?"true":"false"}});await db.insert(sourceAssets).values({id:sourceAssetId,userId:uid,storageKey,originalName:String(body.sourceName||`source.${extension}`),mimeType:match[1],size:bytes.byteLength,width:Number.isFinite(body.sourceWidth)?Math.round(body.sourceWidth):null,height:Number.isFinite(body.sourceHeight)?Math.round(body.sourceHeight):null,checksum:null,status:"ready",createdAt:now,updatedAt:now})}
    }
    const created=[];
    for(const input of body.cards){
      const detail={stem:String(input.stem||""),options:Array.isArray(input.options)?input.options.map(String):[],answer:String(input.answer||""),solution:String(input.solution||""),thinkingModel:input.thinkingModel||null};
      const cardType=input.cardType==="memorization"?"memorization" as const:"question" as const;const card={id:crypto.randomUUID(),userId:uid,cardType,front:String(input.front||""),back:String(input.back||""),explanation:JSON.stringify(detail),personalNote:null,sourceAssetId,directoryId:null,status:"active" as const,archivedAt:null,createdAt:now,updatedAt:now};await db.insert(learningCards).values(card);
      const uniqueNames=[...new Map((Array.isArray(input.tags)?input.tags:[]).map((raw:unknown)=>{const name=String(raw).trim().replace(/\s+/g," ");return [normalize(name),name]}).filter(([key])=>key)).entries()];
      for(const [normalizedName,name] of uniqueNames){let [tag]=await db.select({id:tags.id,name:tags.name}).from(tags).where(and(eq(tags.userId,uid),eq(tags.normalizedName,normalizedName))).limit(1);if(!tag){const id=crypto.randomUUID();await db.insert(tags).values({id,userId:uid,name,normalizedName,createdAt:now,updatedAt:now}).onConflictDoNothing();[tag]=await db.select({id:tags.id,name:tags.name}).from(tags).where(and(eq(tags.userId,uid),eq(tags.normalizedName,normalizedName))).limit(1)}if(tag)await db.insert(learningCardTags).values({learningCardId:card.id,tagId:tag.id}).onConflictDoNothing()}
      created.push({id:card.id,type:cardType==="memorization"?"背诵":"原题",front:card.front,back:card.back,personalNote:"",path:"AI 解析 / 待归类",tags:uniqueNames.map(([,name])=>name),interval:"新卡片",tone:"orange",createdAt:now,lastReviewAt:null,nextReviewAt:null,memoryStatus:"new",sourceUrl:sourceAssetId?`/api/assets/${sourceAssetId}`:null,detail});
    }
    const result={cards:created};await db.update(cardGenerationBatches).set({status:"completed",responseJson:JSON.stringify(result),updatedAt:new Date()}).where(eq(cardGenerationBatches.id,batchId));return Response.json(result,{status:201});
  }catch(error){if(db&&batchId)await db.delete(cardGenerationBatches).where(and(eq(cardGenerationBatches.id,batchId),eq(cardGenerationBatches.status,"pending"))).catch(()=>{});return Response.json({error:error instanceof Error?error.message:"保存卡片失败"},{status:500})}
}

export async function PATCH(request:Request){
  try{
    const uid=await ensureUser(request);const body=await request.json();const id=String(body.id||"").trim();if(!id)return Response.json({error:"缺少卡片 id"},{status:400});
    const db=await getDb();const [stored]=await db.select().from(learningCards).where(and(eq(learningCards.id,id),eq(learningCards.userId,uid))).limit(1);if(!stored)return Response.json({error:"卡片不存在"},{status:404});
    const stem=String(body.stem||"").trim();const options=Array.isArray(body.options)?body.options.map((item:unknown)=>String(item).trim()).filter(Boolean):[];const answer=String(body.answer||"").trim();const solution=String(body.solution||"").trim();if(!stem)return Response.json({error:"题目内容不能为空"},{status:400});if(!answer&&!solution)return Response.json({error:"答案或解析至少填写一项"},{status:400});if(stem.length>10000||answer.length>20000||solution.length>30000)return Response.json({error:"卡片内容超出长度限制"},{status:400});
    const personalNote=body.personalNote===undefined?(stored.personalNote||""):String(body.personalNote||"").trim();if(personalNote.length>20000)return Response.json({error:"个人笔记不能超过 20000 个字符"},{status:400});const rawModel=body.thinkingModel&&typeof body.thinkingModel==="object"?body.thinkingModel:null;const thinkingModel=rawModel?{name:String(rawModel.name||"").trim(),description:String(rawModel.description||"").trim(),steps:Array.isArray(rawModel.steps)?rawModel.steps.map((item:unknown)=>String(item).trim()).filter(Boolean):[]}:null;const detail={stem,options,answer,solution,thinkingModel:thinkingModel&&(thinkingModel.name||thinkingModel.description||thinkingModel.steps.length)?thinkingModel:null};const front=[stem,...options.filter(option=>!stem.replace(/\s+/g,"").includes(option.replace(/\s+/g,"")))].join("\n");const back=stored.cardType==="memorization"?answer:`答案：${answer}\n\n解析：${solution}`;const now=new Date();
    await db.update(learningCards).set({front,back,explanation:JSON.stringify(detail),personalNote:personalNote||null,updatedAt:now}).where(and(eq(learningCards.id,id),eq(learningCards.userId,uid)));await db.delete(learningCardTags).where(eq(learningCardTags.learningCardId,id));
    const uniqueNames=[...new Map((Array.isArray(body.tags)?body.tags:[]).map((raw:unknown)=>{const name=String(raw).trim().replace(/\s+/g," ");return [normalize(name),name]}).filter(([key])=>key)).entries()];for(const [normalizedName,name] of uniqueNames){let [tag]=await db.select({id:tags.id,name:tags.name}).from(tags).where(and(eq(tags.userId,uid),eq(tags.normalizedName,normalizedName))).limit(1);if(!tag){const tagId=crypto.randomUUID();await db.insert(tags).values({id:tagId,userId:uid,name,normalizedName,createdAt:now,updatedAt:now}).onConflictDoNothing();[tag]=await db.select({id:tags.id,name:tags.name}).from(tags).where(and(eq(tags.userId,uid),eq(tags.normalizedName,normalizedName))).limit(1)}if(tag)await db.insert(learningCardTags).values({learningCardId:id,tagId:tag.id}).onConflictDoNothing()}
    return Response.json({card:{id,type:stored.cardType==="question"?"原题":stored.cardType==="memorization"?"背诵":"知识点",front,back,personalNote,path:"AI 解析 / 待归类",tags:uniqueNames.map(([,name])=>name),sourceUrl:stored.sourceAssetId?`/api/assets/${stored.sourceAssetId}`:null,detail,updatedAt:now}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"更新卡片失败"},{status:500})}
}

export async function DELETE(request:Request){
  try{
    const uid=await ensureUser(request);const id=new URL(request.url).searchParams.get("id");if(!id)return Response.json({error:"缺少卡片 id"},{status:400});const db=(await getDb());const [card]=await db.select({id:learningCards.id,sourceAssetId:learningCards.sourceAssetId}).from(learningCards).where(and(eq(learningCards.id,id),eq(learningCards.userId,uid))).limit(1);if(!card)return Response.json({error:"卡片不存在"},{status:404});
    await db.delete(reviewEvents).where(and(eq(reviewEvents.learningCardId,id),eq(reviewEvents.userId,uid)));await db.delete(memoryStates).where(and(eq(memoryStates.learningCardId,id),eq(memoryStates.userId,uid)));await db.delete(learningCardTags).where(eq(learningCardTags.learningCardId,id));await db.delete(learningCards).where(and(eq(learningCards.id,id),eq(learningCards.userId,uid)));
    let sourceDeleted=false;if(card.sourceAssetId){const [remaining]=await db.select({id:learningCards.id}).from(learningCards).where(eq(learningCards.sourceAssetId,card.sourceAssetId)).limit(1);if(!remaining){const [asset]=await db.select().from(sourceAssets).where(and(eq(sourceAssets.id,card.sourceAssetId),eq(sourceAssets.userId,uid))).limit(1);if(asset){await env.UPLOADS.delete(asset.storageKey);await db.delete(sourceAssets).where(and(eq(sourceAssets.id,asset.id),eq(sourceAssets.userId,uid)));sourceDeleted=true}}}
    return Response.json({ok:true,sourceDeleted});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"删除卡片失败"},{status:500})}
}
