const schema = {
  type:"object",additionalProperties:false,required:["questions"],properties:{questions:{type:"array",items:{type:"object",additionalProperties:false,required:["order","questionNumber","stem","options","answer","solution","knowledgePoints","thinkingModel","difficulty"],properties:{order:{type:"integer"},questionNumber:{type:"string"},stem:{type:"string"},options:{type:"array",items:{type:"string"}},answer:{type:"string"},solution:{type:"string"},knowledgePoints:{type:"array",items:{type:"object",additionalProperties:false,required:["name","summary"],properties:{name:{type:"string"},summary:{type:"string"}}}},thinkingModel:{type:"object",additionalProperties:false,required:["name","description","steps"],properties:{name:{type:"string"},description:{type:"string"},steps:{type:"array",items:{type:"string"}}}},difficulty:{type:"integer",minimum:1,maximum:5}}}}}
};

const questionPrompt=`你是悟道个人学习机的题目分析引擎。仔细阅读用户提供的图片，首先判断图片中包含多少道独立题目，然后逐题输出。
必须遵循：
1. 保持原题题干和选项，不要随意改写。
2. 每道题独立解答。answer 字段只写最终答案，不要把推导过程塞进 answer。
3. 知识点名称要简短、稳定。
4. 思维模型不是重复解析，而是回答“下次看到类似题目，应该如何识别并想到这个方法”。
5. 如果图片模糊，在相应字段中明确标记不确定，不要编造。
6. solution 必须分层输出，每个部分单独换行，固定使用“思路：”、“步骤 1：”、“步骤 2：”……、“结论：”的结构。每步只表达一个关键推理，避免冗长重复和自我否定式的过程。
7. 所有内容使用中文，除非原题为其他语言。`;

const memorizationPrompt=`你是悟道个人学习机的背诵内容分析引擎。根据用户上传的图片提取需要记忆的知识，并拆分成若干独立、简洁、适合间隔复习的背诵单元。
目标是帮助学习者真正记住知识，并知道如何使用、用在什么场景。
每个背诵单元必须遵循：
1. stem：根据该单元内容自动生成一个明确的回忆问题，作为卡片正面；问题必须能独立理解，不能直接泄露答案。
2. options：固定输出空数组。
3. answer：作为卡片核心答案，必须包含“原始内容：”和“背诵要点：”两部分。原始内容忠实保留图片中的关键信息；背诵要点要简洁精炼，不遗漏必要条件。
4. solution：固定使用“知识解析：”“背诵技巧：”“关键词总结：”“怎么用：”“用在哪：”五部分，每部分单独换行。解释知识含义、记忆方法、关键词、使用方法和适用场景。
5. knowledgePoints：列出简短、稳定的知识点名称与一句话总结，用于生成标签。
6. thinkingModel.name：填写适合该知识的记忆模型名称；description 说明记忆逻辑；steps 给出可执行的记忆与应用步骤。
7. questionNumber 使用“要点 1”“要点 2”格式；difficulty 表示记忆难度，范围 1 到 5。
8. 相同内容不要重复生成；图片模糊时明确标注不确定，不要编造；所有内容默认使用中文。`;

function outputText(data:any){if(typeof data.output_text==="string")return data.output_text;for(const item of data.output||[])for(const c of item.content||[])if(c.type==="output_text"&&c.text)return c.text;return ""}
function valid(result:any){return result&&Array.isArray(result.questions)&&result.questions.every((q:any)=>typeof q.stem==="string"&&typeof q.answer==="string"&&typeof q.solution==="string"&&Array.isArray(q.knowledgePoints)&&q.thinkingModel&&Array.isArray(q.thinkingModel.steps))}

export async function POST(request:Request){
  try{
    const body=await request.json();let {provider="openai",model="gpt-5.4",baseUrl,apiKey}=body;const {image,modelConfigId}=body;const analysisPrompt=body.mode==="memorization"?memorizationPrompt:questionPrompt;if(typeof image!=="string"||!image.startsWith("data:image/"))return Response.json({error:"未收到有效图片"},{status:400});
    if(modelConfigId){const uid=request.headers.get("oai-authenticated-user-id")||"local-user";const requestedModel=String(model||"").trim();const [stored]=await (await getDb()).select().from(modelConfigs).where(and(eq(modelConfigs.id,modelConfigId),eq(modelConfigs.userId,uid))).limit(1);if(!stored||!stored.enabled||stored.validationStatus!=="valid")return Response.json({error:"指定的模型不存在、未验证或已停用"},{status:404});provider=stored.provider;model=requestedModel||stored.model;baseUrl=stored.baseUrl;apiKey=await decryptApiKey(stored.encryptedApiKey)}
    const key=apiKey||process.env.OPENAI_API_KEY;if(!key)return Response.json({error:"未配置 API Key，请先在设置 → 模型管理中添加"},{status:401});
    let raw="";
    if(provider==="openai"){
      const response=await fetch(`${baseUrl||"https://api.openai.com/v1"}/responses`,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${key}`},body:JSON.stringify({model,input:[{role:"user",content:[{type:"input_text",text:analysisPrompt},{type:"input_image",image_url:image,detail:"high"}]}],text:{format:{type:"json_schema",name:"learner_question_analysis",strict:true,schema}}})});const data=await response.json();if(!response.ok)throw new Error(data?.error?.message||`OpenAI 请求失败 (${response.status})`);raw=outputText(data);
    }else if(provider==="anthropic"){
      const match=image.match(/^data:(image\/[^;]+);base64,(.+)$/);if(!match)throw new Error("图片格式无效");const response=await fetch(`${baseUrl||"https://api.anthropic.com/v1"}/messages`,{method:"POST",headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},body:JSON.stringify({model,max_tokens:12000,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:match[1],data:match[2]}},{type:"text",text:`${analysisPrompt}\n仅输出符合指定结构的 JSON，顶层字段为 questions。`}]}]})});const data=await response.json();if(!response.ok)throw new Error(data?.error?.message||`Anthropic 请求失败 (${response.status})`);raw=data.content?.find((c:any)=>c.type==="text")?.text||"";
    }else if(provider==="gemini"){
      const match=image.match(/^data:(image\/[^;]+);base64,(.+)$/);if(!match)throw new Error("图片格式无效");const response=await fetch(`${baseUrl||"https://generativelanguage.googleapis.com/v1beta"}/models/${model}:generateContent?key=${encodeURIComponent(key)}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:analysisPrompt},{inline_data:{mime_type:match[1],data:match[2]}}]}],generationConfig:{responseMimeType:"application/json",responseJsonSchema:schema}})});const data=await response.json();if(!response.ok)throw new Error(data?.error?.message||`Gemini 请求失败 (${response.status})`);raw=data.candidates?.[0]?.content?.parts?.[0]?.text||"";
    }else{
      const response=await fetch(`${baseUrl||"https://api.deepseek.com/v1"}/chat/completions`,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${key}`},body:JSON.stringify({model,messages:[{role:"user",content:[{type:"text",text:`${analysisPrompt}\n仅输出 JSON。`},{type:"image_url",image_url:{url:image}}]}],response_format:{type:"json_object"}})});const data=await response.json();if(!response.ok){const providerError=String(data?.error?.message||data?.error||"");if(/unknown variant [`']?image_url|expected [`']?text|image.?url.*(?:unsupported|not supported)/i.test(providerError))throw new Error(`当前模型 ${model} 不支持图片输入，请切换到支持视觉识别的模型后重试`);throw new Error(providerError||`兼容接口请求失败 (${response.status})`)}raw=data.choices?.[0]?.message?.content||"";
    }
    const cleaned=raw.replace(/^```json\s*/i,"").replace(/```$/i,"").trim();const result=JSON.parse(cleaned);if(!valid(result))throw new Error("AI 返回结构校验失败，请重试");return Response.json(result);
  }catch(error){return Response.json({error:error instanceof Error?error.message:"未知解析错误"},{status:500})}
}
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { modelConfigs } from "../../../../db/schema";
import { decryptApiKey } from "../../../../lib/model-secrets";
