import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { modelConfigs } from "../../../../db/schema";
import { decryptApiKey } from "../../../../lib/model-secrets";

function userId(request:Request){return request.headers.get("oai-authenticated-user-id")||"local-user"}
export async function POST(request:Request){
  try{
    const body=await request.json();let provider=String(body.provider||"gemini");let apiKey=String(body.apiKey||"").trim();let baseUrl=String(body.baseUrl||"").replace(/\/$/,"");
    if(body.configId){const [stored]=await (await getDb()).select().from(modelConfigs).where(and(eq(modelConfigs.id,String(body.configId)),eq(modelConfigs.userId,userId(request)))).limit(1);if(!stored||!stored.enabled||stored.validationStatus!=="valid")return Response.json({error:"找不到已验证的模型配置"},{status:404});provider=stored.provider;apiKey=await decryptApiKey(stored.encryptedApiKey);baseUrl=(stored.baseUrl||"").replace(/\/$/,"")}
    if(!apiKey)return Response.json({error:"请先输入 API Key"},{status:400});
    if(provider==="gemini"){
      baseUrl=baseUrl||"https://generativelanguage.googleapis.com/v1beta";const models:any[]=[];let pageToken="";do{const query=new URLSearchParams({key:apiKey,pageSize:"1000"});if(pageToken)query.set("pageToken",pageToken);const response=await fetch(`${baseUrl}/models?${query}`);const data=await response.json();if(!response.ok)throw new Error(data?.error?.message||`Google 模型列表请求失败 (${response.status})`);models.push(...(data.models||[]));pageToken=data.nextPageToken||""}while(pageToken);const available=models.filter(model=>model.supportedGenerationMethods?.includes("generateContent")).map(model=>({id:String(model.name||"").replace(/^models\//,""),name:model.displayName||model.name,description:model.description||"",inputTokenLimit:model.inputTokenLimit||null,outputTokenLimit:model.outputTokenLimit||null})).filter(model=>model.id).sort((a,b)=>a.id.localeCompare(b.id));return Response.json({models:available,count:available.length});
    }
    baseUrl=baseUrl||(provider==="anthropic"?"https://api.anthropic.com/v1":provider==="deepseek"?"https://api.deepseek.com/v1":"https://api.openai.com/v1");const headers=provider==="anthropic"?{"x-api-key":apiKey,"anthropic-version":"2023-06-01"}:{authorization:`Bearer ${apiKey}`};const response=await fetch(`${baseUrl}/models`,{headers});const data=await response.json();if(!response.ok)throw new Error(data?.error?.message||data?.error||`模型列表请求失败 (${response.status})`);const raw=Array.isArray(data.data)?data.data:Array.isArray(data.models)?data.models:[];const available=raw.map((item:any)=>({id:String(item.id||item.name||"").replace(/^models\//,""),name:item.display_name||item.displayName||item.id||item.name,description:item.description||"",inputTokenLimit:null,outputTokenLimit:null})).filter((item:any)=>item.id).sort((a:any,b:any)=>a.id.localeCompare(b.id));return Response.json({models:available,count:available.length});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"拉取模型失败"},{status:500})}
}
