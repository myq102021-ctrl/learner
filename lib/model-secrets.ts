import { env } from "cloudflare:workers";

function bytesToBase64(bytes:Uint8Array){let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary)}
function base64ToBytes(value:string){return Uint8Array.from(atob(value),c=>c.charCodeAt(0))}
async function key(){const secret=(env as unknown as Record<string,string>).MODEL_KEYS_MASTER_KEY||process.env.MODEL_KEYS_MASTER_KEY||"learner-local-development-key";const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(secret));return crypto.subtle.importKey("raw",digest,{name:"AES-GCM"},false,["encrypt","decrypt"])}
export async function encryptApiKey(value:string){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},await key(),new TextEncoder().encode(value));return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`}
export async function decryptApiKey(value:string){const [iv,data]=value.split(".");const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv:base64ToBytes(iv)},await key(),base64ToBytes(data));return new TextDecoder().decode(clear)}
