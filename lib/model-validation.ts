type ModelValidationInput={provider:string;model:string;baseUrl:string;apiKey:string};

function cleanBase(value:string,fallback:string){return (value||fallback).replace(/\/$/,"")}
async function errorMessage(response:Response){try{const data=await response.json() as {error?:{message?:string}|string;message?:string};return typeof data.error==="string"?data.error:data.error?.message||data.message||`验证失败 (${response.status})`}catch{return `验证失败 (${response.status})`}}

export async function validateModelConfig(input:ModelValidationInput){
  try{
    const model=input.model.replace(/^models\//,"");let response:Response;
    if(input.provider==="gemini"){
      const base=cleanBase(input.baseUrl,"https://generativelanguage.googleapis.com/v1beta");
      response=await fetch(`${base}/models/${encodeURIComponent(model)}?key=${encodeURIComponent(input.apiKey)}`);
    }else if(input.provider==="anthropic"){
      const base=cleanBase(input.baseUrl,"https://api.anthropic.com/v1");
      response=await fetch(`${base}/models/${encodeURIComponent(model)}`,{headers:{"x-api-key":input.apiKey,"anthropic-version":"2023-06-01"}});
    }else{
      const fallback=input.provider==="deepseek"?"https://api.deepseek.com/v1":input.provider==="alibaba"?"https://dashscope.aliyuncs.com/compatible-mode/v1":input.provider==="byteplus"?"https://ark.cn-beijing.volces.com/api/v3":"https://api.openai.com/v1";
      const base=cleanBase(input.baseUrl,fallback);
      const modelsUrl=input.provider==="alibaba"?`${base.replace(/\/compatible-mode\/v1$/,"").replace(/\/api\/v1$/,"")}/api/v1/models?page_no=1&page_size=500`:`${base}/models`;
      response=await fetch(modelsUrl,{headers:{authorization:`Bearer ${input.apiKey}`}});
      if(response.ok){const data=await response.json() as {data?:Array<{id?:string}>;output?:{models?:Array<{model?:string}>}};const ids=input.provider==="alibaba"?data.output?.models?.map(item=>item.model):data.data?.map(item=>item.id);if(Array.isArray(ids)&&ids.length&&!ids.includes(model))return {valid:false,error:`当前 API Key 无权使用模型 ${model}`}}
    }
    if(!response.ok)return {valid:false,error:await errorMessage(response)};
    return {valid:true,error:null};
  }catch(error){return {valid:false,error:error instanceof Error?error.message:"模型连接验证失败"}}
}
