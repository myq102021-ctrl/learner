import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { learningCards, memoryStates, reviewEvents, users } from "../../../db/schema";

function identity(request:Request){return {id:request.headers.get("oai-authenticated-user-id")||"local-user",email:request.headers.get("oai-authenticated-user-email")||"local@learner.app"}}
export async function POST(request:Request){
  try{
    const user=identity(request);const body=await request.json();const cardId=String(body.cardId||"");const rating=String(body.rating||"") as "again"|"hard"|"good"|"easy";if(!cardId||!["again","hard","good","easy"].includes(rating))return Response.json({error:"复习记录参数无效"},{status:400});
    const db=getDb();await db.insert(users).values({id:user.id,email:user.email,name:null,timezone:"Asia/Shanghai",createdAt:new Date(),updatedAt:new Date()}).onConflictDoNothing();const [card]=await db.select({id:learningCards.id}).from(learningCards).where(and(eq(learningCards.id,cardId),eq(learningCards.userId,user.id))).limit(1);if(!card)return Response.json({error:"卡片不存在"},{status:404});
    const [previous]=await db.select().from(memoryStates).where(and(eq(memoryStates.userId,user.id),eq(memoryStates.learningCardId,cardId))).limit(1);const now=new Date();const days={again:0,hard:1,good:4,easy:15}[rating];const nextReviewAt=new Date(now.getTime()+days*86400000);const nextStatus=rating==="again"?"learning":"reviewing" as const;
    await db.insert(memoryStates).values({id:previous?.id||crypto.randomUUID(),userId:user.id,learningCardId:cardId,status:nextStatus,reviewCount:(previous?.reviewCount||0)+1,lapseCount:(previous?.lapseCount||0)+(rating==="again"?1:0),currentIntervalDays:days,easeFactor:previous?.easeFactor||250,lastRating:rating,lastReviewAt:now,nextReviewAt,schedulerType:"ebbinghaus",schedulerState:null,updatedAt:now}).onConflictDoUpdate({target:[memoryStates.userId,memoryStates.learningCardId],set:{status:nextStatus,reviewCount:(previous?.reviewCount||0)+1,lapseCount:(previous?.lapseCount||0)+(rating==="again"?1:0),currentIntervalDays:days,lastRating:rating,lastReviewAt:now,nextReviewAt,updatedAt:now}});
    await db.insert(reviewEvents).values({id:crypto.randomUUID(),userId:user.id,learningCardId:cardId,reviewedAt:now,rating,previousStatus:previous?.status||"new",nextStatus,previousIntervalDays:previous?.currentIntervalDays||0,nextIntervalDays:days,previousDueAt:previous?.nextReviewAt||null,nextDueAt:nextReviewAt,schedulerType:"ebbinghaus",schedulerVersion:"1",createdAt:now});return Response.json({ok:true,lastReviewAt:now,nextReviewAt});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"保存复习记录失败"},{status:500})}
}
