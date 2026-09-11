import fs from "fs";
import crypto from "node:crypto";
import { dataFile } from "./server_paths";
import type { ProviderProfile, ProviderRole, ProviderSettings } from "./src/providers/types";

const SETTINGS_FILE=dataFile("provider-settings.json");
const SECRETS_FILE=dataFile("secrets.json");
const DEFAULTS:ProviderSettings={
  profiles:[
    {id:"ollama-local",name:"Local Ollama",kind:"ollama",baseUrl:"http://127.0.0.1:11434/v1",chatModel:"qwen2.5:3b",enabled:true,capabilities:{chat:true,tools:true,streaming:false}},
    {id:"huggingface-cloud",name:"Hugging Face",kind:"huggingface",baseUrl:"https://router.huggingface.co/v1",chatModel:"deepseek-ai/DeepSeek-R1-0528",speechModel:"openai/whisper-large-v3",enabled:false,capabilities:{chat:true,tools:true,speechToText:true}},
    {id:"openai-cloud",name:"OpenAI",kind:"openai",baseUrl:"https://api.openai.com/v1",chatModel:"gpt-4o-mini",speechModel:"whisper-1",enabled:false,capabilities:{chat:true,tools:true,speechToText:true}},
    {id:"custom-provider",name:"Custom OpenAI-compatible",kind:"custom",baseUrl:"http://127.0.0.1:8000/v1",chatModel:"",speechModel:"",enabled:false,capabilities:{chat:true,tools:false,speechToText:false}},
  ],
  roles:{assistant:"ollama-local",memory:"ollama-local",fallback:"huggingface-cloud",speechToText:"huggingface-cloud"},
};
function json(file:string):any { try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return {};} }
function privateWrite(file:string,value:unknown){fs.writeFileSync(file,JSON.stringify(value,null,2),{encoding:"utf8",mode:0o600});try{fs.chmodSync(file,0o600)}catch{}}
export function settings():ProviderSettings {
  const saved=json(SETTINGS_FILE);
  const profiles=Array.isArray(saved.profiles)&&saved.profiles.length?saved.profiles:DEFAULTS.profiles;
  return {profiles,roles:{...DEFAULTS.roles,...(saved.roles||{})}};
}
export function publicSettings():ProviderSettings {
  const s=settings(); return {profiles:s.profiles.map(p=>({...p,hasSecret:!!secret(p.id)})),roles:s.roles};
}
export function secret(id:string):string|undefined {
  const value=json(SECRETS_FILE).providerSecrets?.[id]; return typeof value==="string"&&value.trim()?value.trim():undefined;
}
export function upsert(profile:ProviderProfile,key?:string):ProviderProfile {
  const s=settings(); const clean={...profile,id:profile.id||crypto.randomUUID(),name:String(profile.name||"").trim(),baseUrl:String(profile.baseUrl||"").trim(),chatModel:String(profile.chatModel||"").trim(),speechModel:String(profile.speechModel||"").trim()};
  if(!clean.name) throw new Error("Provider name is required.");
  const index=s.profiles.findIndex(p=>p.id===clean.id); if(index>=0)s.profiles[index]=clean;else s.profiles.push(clean); privateWrite(SETTINGS_FILE,s);
  if(key?.trim()){const sec=json(SECRETS_FILE);sec.providerSecrets={...(sec.providerSecrets||{}),[clean.id]:key.trim()};privateWrite(SECRETS_FILE,sec)}
  return clean;
}
export function remove(id:string){const s=settings();s.profiles=s.profiles.filter(p=>p.id!==id);for(const role of Object.keys(s.roles) as ProviderRole[])if(s.roles[role]===id)delete s.roles[role];privateWrite(SETTINGS_FILE,s);const sec=json(SECRETS_FILE);if(sec.providerSecrets){delete sec.providerSecrets[id];privateWrite(SECRETS_FILE,sec)}}
export function setRoles(roles:Partial<Record<ProviderRole,string>>){const s=settings();const ids=new Set(s.profiles.map(p=>p.id));for(const [role,id] of Object.entries(roles))if(id&&!ids.has(id))throw new Error(`Unknown provider selected for ${role}.`);s.roles={...s.roles,...roles};privateWrite(SETTINGS_FILE,s);return s.roles}
export function profileFor(role:ProviderRole):ProviderProfile {const s=settings(),id=s.roles[role],p=s.profiles.find(x=>x.id===id&&x.enabled);if(!p)throw new Error(`No enabled provider configured for ${role}.`);return p}
