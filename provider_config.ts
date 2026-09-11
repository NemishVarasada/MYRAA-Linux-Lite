import fs from "fs";
import crypto from "node:crypto";
import path from "node:path";
import { dataFile } from "./server_paths";
import { presetFor, profileFromPreset } from "./src/providers/catalog";
import type { ProviderProfile, ProviderRole, ProviderSettings } from "./src/providers/types";

const SETTINGS_FILE=dataFile("provider-settings.json");
const SECRETS_FILE=dataFile("secrets.json");
const LOCAL=profileFromPreset("vaani-local","vaani-local");
const DEFAULTS:ProviderSettings={profiles:[LOCAL],roles:{assistant:LOCAL.id,speechToText:LOCAL.id,textToSpeech:LOCAL.id,memory:LOCAL.id,fallback:LOCAL.id}};
function json(file:string):any{try{return JSON.parse(fs.readFileSync(file,"utf8"))}catch{return{}}}
function privateWrite(file:string,value:unknown){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2),{encoding:"utf8",mode:0o600});try{fs.chmodSync(file,0o600)}catch{}}
function normalize(profile:ProviderProfile):ProviderProfile{
  const preset=presetFor(profile.presetId||profile.kind);
  const custom=(profile.kind==="custom");
  return {...profile,presetId:profile.presetId||preset?.id,apiStyle:profile.apiStyle||preset?.apiStyle||"openai",requiresKey:profile.requiresKey??preset?.requiresKey??false,baseUrl:String(profile.baseUrl||preset?.baseUrl||"").trim().replace(/\/+$/,"") ,chatModel:String(profile.chatModel||"").trim(),speechModel:String(profile.speechModel||"").trim(),ttsModel:String(profile.ttsModel||"").trim(),capabilities:custom?{...profile.capabilities}:{...(preset?.capabilities||profile.capabilities)}};
}
export function settings():ProviderSettings{
  const saved=json(SETTINGS_FILE);let profiles:Array<ProviderProfile>=Array.isArray(saved.profiles)?saved.profiles.map(normalize):[];
  if(!profiles.some(p=>p.kind==="vaani-local"))profiles.unshift(LOCAL);
  if(!profiles.length)profiles=[LOCAL];
  const roles={...DEFAULTS.roles,...(saved.roles||{})};
  return{profiles,roles};
}
export function publicSettings():ProviderSettings{const s=settings();return{profiles:s.profiles.map(p=>({...p,hasSecret:!!secret(p.id)})),roles:s.roles}}
export function secret(id:string):string|undefined{const value=json(SECRETS_FILE).providerSecrets?.[id];return typeof value==="string"&&value.trim()?value.trim():undefined}
export function upsert(profile:ProviderProfile,key?:string):ProviderProfile{
  const s=settings(),clean=normalize({...profile,id:profile.id||crypto.randomUUID(),name:String(profile.name||"").trim(),enabled:profile.enabled!==false});
  if(!clean.name)throw new Error("Provider name is required.");if(!clean.baseUrl)throw new Error("Provider URL is required.");
  const index=s.profiles.findIndex(p=>p.id===clean.id);if(index>=0)s.profiles[index]=clean;else s.profiles.push(clean);privateWrite(SETTINGS_FILE,s);
  if(key?.trim()){const sec=json(SECRETS_FILE);sec.providerSecrets={...(sec.providerSecrets||{}),[clean.id]:key.trim()};privateWrite(SECRETS_FILE,sec)}
  return clean;
}
export function addPreset(presetId:string){const profile=profileFromPreset(presetId);return upsert(profile)}
export function remove(id:string){if(id==="vaani-local")throw new Error("Vaani Local is part of the offline product and cannot be deleted.");const s=settings();s.profiles=s.profiles.filter(p=>p.id!==id);for(const role of Object.keys(s.roles)as ProviderRole[])if(s.roles[role]===id)delete s.roles[role];privateWrite(SETTINGS_FILE,s);const sec=json(SECRETS_FILE);if(sec.providerSecrets){delete sec.providerSecrets[id];privateWrite(SECRETS_FILE,sec)}}
const roleCapability:Record<ProviderRole,keyof ProviderProfile["capabilities"]>={assistant:"chat",memory:"chat",fallback:"chat",speechToText:"speechToText",textToSpeech:"textToSpeech"};
export function setRoles(patch:Partial<Record<ProviderRole,string>>){const s=settings();for(const[role,id]of Object.entries(patch)as[ProviderRole,string][]){if(!id){delete s.roles[role];continue}const p=s.profiles.find(x=>x.id===id);if(!p)throw new Error(`Unknown provider selected for ${role}.`);if(!p.enabled)throw new Error(`${p.name} is disabled.`);if(!p.capabilities[roleCapability[role]])throw new Error(`${p.name} cannot be used for ${role}.`);s.roles[role]=id}privateWrite(SETTINGS_FILE,s);return s.roles}
export function autoAssign(id:string){const s=settings(),p=s.profiles.find(x=>x.id===id);if(!p)throw new Error("Provider not found.");const roles:Partial<Record<ProviderRole,string>>={};if(p.capabilities.chat){roles.assistant=id;roles.memory=id;roles.fallback=id}if(p.capabilities.speechToText)roles.speechToText=id;if(p.capabilities.textToSpeech)roles.textToSpeech=id;return setRoles(roles)}
export function profileFor(role:ProviderRole):ProviderProfile{const s=settings(),id=s.roles[role],p=s.profiles.find(x=>x.id===id&&x.enabled);if(!p)throw new Error(`No enabled provider configured for ${role}.`);if(!p.capabilities[roleCapability[role]])throw new Error(`${p.name} does not support ${role}.`);return p}
