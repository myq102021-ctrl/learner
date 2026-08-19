import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { modelConfigs } from "../../../../db/schema";
import { decryptApiKey } from "../../../../lib/model-secrets";

function userId(request:Request){return request.headers.get("oai-authenticated-user-id")||"local-user"}

export async function POST(request:Request){
  try{
    const body=await request.json();
    let apiKey=String(body.apiKey||"").trim();
    let baseUrl=String(body.baseUrl||"https://generativelanguage.googleapis.com/v1beta").replace(/\/$/,"");
    if(body.configId){
      const [stored]=await getDb().select().from(modelConfigs).where(and(eq(modelConfigs.id,String(body.configId)),eq(modelConfigs.userId,userId(request)))).limit(1);
      if(!stored||stored.provider!=="gemini")return Response.json({error:"找不到 Gemini 配置"},{status:404});
      apiKey=await decryptApiKey(stored.encryptedApiKey);baseUrl=(stored.baseUrl||baseUrl).replace(/\/$/,"");
    }
    if(!apiKey)return Response.json({error:"请先输入 Gemini API Key"},{status:400});
    const models:any[]=[];let pageToken="";
    do{
      const query=new URLSearchParams({key:apiKey,pageSize:"1000"});if(pageToken)query.set("pageToken",pageToken);
      const response=await fetch(`${baseUrl}/models?${query}`);const data=await response.json();
      if(!response.ok)throw new Error(data?.error?.message||`Google 模型列表请求失败 (${response.status})`);
      models.push(...(data.models||[]));pageToken=data.nextPageToken||"";
    }while(pageToken);
    const available=models.filter(model=>model.supportedGenerationMethods?.includes("generateContent")).map(model=>({id:String(model.name||"").replace(/^models\//,""),name:model.displayName||model.name,description:model.description||"",inputTokenLimit:model.inputTokenLimit||null,outputTokenLimit:model.outputTokenLimit||null})).filter(model=>model.id).sort((a,b)=>a.id.localeCompare(b.id));
    return Response.json({models:available,count:available.length});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"拉取 Google 模型失败"},{status:500})}
}
