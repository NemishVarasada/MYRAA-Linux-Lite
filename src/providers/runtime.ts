import crypto from "node:crypto";
import type { ChatMessage, ChatResult, ProviderProfile, ToolCall } from "./types";

const defaults: Record<string,string> = {
  ollama: "http://127.0.0.1:11434/v1",
  huggingface: "https://router.huggingface.co/v1",
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  custom: "http://127.0.0.1:8000/v1",
};
const url = (base:string, suffix:string) => `${base.replace(/\/+$/,"")}${suffix}`;
const headers = (secret?:string) => secret ? { Authorization:`Bearer ${secret}` } : {};
const errorText = async (response:Response) => {
  const body:any = await response.json().catch(()=>({}));
  return body?.error?.message || body?.error || body?.message || `HTTP ${response.status}`;
};
export function normalizedProfile(profile:ProviderProfile):ProviderProfile {
  return {...profile, baseUrl:(profile.baseUrl || defaults[profile.kind]).replace(/\/+$/,"")};
}
export async function testProvider(profile:ProviderProfile, secret?:string) {
  const p=normalizedProfile(profile), started=Date.now();
  try {
    const response=await fetch(url(p.baseUrl,"/models"),{headers:headers(secret),signal:AbortSignal.timeout(15000)});
    return {ok:response.ok,message:response.ok?`Connected to ${p.name}.`:`Connection failed: ${await errorText(response)}`,latencyMs:Date.now()-started};
  } catch(error:any) { return {ok:false,message:`Connection failed: ${error.message}`,latencyMs:Date.now()-started}; }
}
export async function chat(profile:ProviderProfile, secret:string|undefined, messages:ChatMessage[], tools?:unknown[]):Promise<ChatResult> {
  const p=normalizedProfile(profile);
  if(!p.chatModel) throw new Error(`${p.name} has no chat model configured.`);
  if(!["ollama","custom"].includes(p.kind) && !secret) throw new Error(`${p.name} needs an API key or token.`);
  const body:any={model:p.chatModel,messages,temperature:0.25,max_tokens:800};
  if(tools?.length && p.capabilities.tools) { body.tools=tools; body.tool_choice="auto"; }
  const response=await fetch(url(p.baseUrl,"/chat/completions"),{method:"POST",headers:{...headers(secret),"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
  if(!response.ok) throw new Error(await errorText(response));
  const data:any=await response.json();
  const message:any=data.choices?.[0]?.message;
  if(!message) throw new Error(`${p.name} returned no message.`);
  const calls:ToolCall[]=(message.tool_calls||[]).map((call:any)=>{
    let args:Record<string,unknown>={};
    try { args=typeof call.function?.arguments==="string"?JSON.parse(call.function.arguments):call.function?.arguments||{}; } catch { throw new Error(`Invalid tool arguments from ${p.name}.`); }
    return {id:String(call.id||crypto.randomUUID()),name:String(call.function?.name||""),arguments:args,raw:call};
  }).filter((call:ToolCall)=>call.name);
  return {text:String(message.content||""),toolCalls:calls,assistantMessage:{role:"assistant",content:String(message.content||""),tool_calls:message.tool_calls},raw:data};
}
export async function transcribe(profile:ProviderProfile, secret:string|undefined, audio:Buffer):Promise<string> {
  const p=normalizedProfile(profile);
  if(!p.speechModel) throw new Error(`${p.name} has no speech model configured.`);
  if(!["ollama","custom"].includes(p.kind) && !secret) throw new Error(`${p.name} needs an API key or token.`);
  if(p.kind==="huggingface") {
    const endpoint="https://router.huggingface.co/hf-inference/models/"+p.speechModel;
    const response=await fetch(endpoint,{method:"POST",headers:{...headers(secret),"Content-Type":"audio/wav"},body:audio,signal:AbortSignal.timeout(120000)});
    if(!response.ok) throw new Error(await errorText(response));
    const data:any=await response.json();
    return String(data.text||"").trim();
  }
  if(p.kind==="ollama") throw new Error("Ollama does not provide speech-to-text. Configure Hugging Face, Groq, OpenAI, or a custom Whisper-compatible endpoint.");
  const form=new FormData();
  form.append("file",new Blob([audio],{type:"audio/wav"}),"speech.wav");
  form.append("model",p.speechModel);
  const response=await fetch(url(p.baseUrl,"/audio/transcriptions"),{method:"POST",headers:headers(secret),body:form,signal:AbortSignal.timeout(120000)});
  if(!response.ok) throw new Error(await errorText(response));
  const data:any=await response.json();
  return String(data.text||"").trim();
}
