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
      const fallback=input.provider==="deepseek"?"https://api.deepseek.com/v1":"https://api.openai.com/v1";
      const base=cleanBase(input.baseUrl,fallback);
      response=await fetch(`${base}/models`,{headers:{authorization:`Bearer ${input.apiKey}`}});
      if(response.ok){const data=await response.json() as {data?:Array<{id?:string}>};if(Array.isArray(data.data)&&data.data.length&&!data.data.some(item=>item.id===model))return {valid:false,error:`当前 API Key 无权使用模型 ${model}`}}
    }
    if(!response.ok)return {valid:false,error:await errorMessage(response)};
    return {valid:true,error:null};
  }catch(error){return {valid:false,error:error instanceof Error?error.message:"模型连接验证失败"}}
}
