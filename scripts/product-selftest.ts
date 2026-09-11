import assert from "node:assert/strict";
import { PROVIDER_CATALOG, profileFromPreset } from "../src/providers/catalog";
import { testProvider } from "../src/providers/runtime";

assert(PROVIDER_CATALOG.length >= 14);
assert.equal(new Set(PROVIDER_CATALOG.map(p=>p.id)).size,PROVIDER_CATALOG.length);
for(const id of ["vaani-local","ollama","openai","anthropic","google","groq","openrouter","huggingface","mistral","deepseek","xai","together","perplexity","custom"])assert(PROVIDER_CATALOG.some(p=>p.id===id),id);
const openai=profileFromPreset("openai","openai-test");
const anthropic=profileFromPreset("anthropic","anthropic-test");
let mode="openai";
globalThis.fetch=(async()=>{
  const body=mode==="anthropic"?{content:[{type:"text",text:"VAANI_OK"}]}:{choices:[{message:{content:"VAANI_OK"}}]};
  return new Response(JSON.stringify(body),{status:200,headers:{"Content-Type":"application/json"}});
}) as typeof fetch;
const first=await testProvider(openai,"test-key");assert.equal(first.ok,true);assert.match(first.reply||"",/VAANI_OK/);
mode="anthropic";const second=await testProvider(anthropic,"test-key");assert.equal(second.ok,true);assert.match(second.reply||"",/VAANI_OK/);
console.log(`Product self-test passed: ${PROVIDER_CATALOG.length} providers and real-response adapters.`);
