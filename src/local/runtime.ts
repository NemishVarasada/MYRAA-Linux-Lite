import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { DATA_DIR } from "../../server_paths";

const execFileAsync=promisify(execFile);
const LOCAL_DIR=process.env.VAANI_LOCAL_AI_DIR || path.join(process.cwd(),"local_ai");
const BIN_DIR=path.join(LOCAL_DIR,"bin");
const MODEL_DIR=path.join(LOCAL_DIR,"models");
const LLAMA=path.join(BIN_DIR,"llama-server");
const WHISPER=path.join(BIN_DIR,"whisper-cli");
const PIPER=path.join(BIN_DIR,"piper");
const CHAT_MODEL=path.join(MODEL_DIR,"assistant.gguf");
const STT_MODEL=path.join(MODEL_DIR,"whisper.bin");
const TTS_MODEL=path.join(MODEL_DIR,"voice.onnx");
const TTS_CONFIG=path.join(MODEL_DIR,"voice.onnx.json");
const LOCAL_CHAT_URL="http://127.0.0.1:11435";
let llamaProcess:ChildProcess|null=null;

function missingFiles(){return [LLAMA,WHISPER,PIPER,CHAT_MODEL,STT_MODEL,TTS_MODEL,TTS_CONFIG].filter(f=>!fs.existsSync(f));}
function executable(file:string){try{fs.chmodSync(file,0o755)}catch{}}
async function chatReady(){try{return (await fetch(`${LOCAL_CHAT_URL}/v1/models`,{signal:AbortSignal.timeout(1000)})).ok}catch{return false}}
export async function ensureLocalChat(){
  if(await chatReady())return;
  const missing=missingFiles();
  if(missing.length)throw new Error(`Offline engine is not installed in this build. Missing: ${missing.map(f=>path.relative(LOCAL_DIR,f)).join(", ")}`);
  executable(LLAMA);
  llamaProcess=spawn(LLAMA,["-m",CHAT_MODEL,"--host","127.0.0.1","--port","11435","-c","4096","-ngl","0"],{cwd:LOCAL_DIR,stdio:"ignore",windowsHide:true});
  llamaProcess.once("exit",()=>{llamaProcess=null});
  for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,500));if(await chatReady())return;}
  throw new Error("The bundled offline text engine did not start.");
}
export async function localStatus(){const missing=missingFiles();return{installed:missing.length===0,chatReady:await chatReady(),directory:LOCAL_DIR,missing:missing.map(f=>path.relative(LOCAL_DIR,f))};}
export async function transcribeLocal(audio:Buffer){
  const missing=missingFiles();if(missing.length)throw new Error("The bundled offline speech engine is missing from this installer.");
  executable(WHISPER);const temp=path.join(DATA_DIR,"tmp");fs.mkdirSync(temp,{recursive:true});const id=crypto.randomUUID(),input=path.join(temp,`${id}.wav`),out=path.join(temp,id);fs.writeFileSync(input,audio);
  try{await execFileAsync(WHISPER,["-m",STT_MODEL,"-f",input,"-of",out,"-otxt","-l","auto","-nt"],{timeout:180000,maxBuffer:4*1024*1024});return fs.readFileSync(`${out}.txt`,"utf8").trim()}finally{for(const file of[input,`${out}.txt`])try{fs.unlinkSync(file)}catch{}}
}
export async function speakLocal(text:string){
  const missing=missingFiles();if(missing.length)throw new Error("The bundled offline voice engine is missing from this installer.");
  executable(PIPER);const temp=path.join(DATA_DIR,"tmp");fs.mkdirSync(temp,{recursive:true});const output=path.join(temp,`${crypto.randomUUID()}.wav`);
  await new Promise<void>((resolve,reject)=>{const child=spawn(PIPER,["--model",TTS_MODEL,"--config",TTS_CONFIG,"--output_file",output],{cwd:LOCAL_DIR,stdio:["pipe","ignore","pipe"]});let error="";child.stderr.on("data",d=>error+=d);child.on("error",reject);child.on("exit",code=>code===0?resolve():reject(new Error(error||`Piper exited ${code}`)));child.stdin.end(text)});
  const audio=fs.readFileSync(output);try{fs.unlinkSync(output)}catch{}return audio;
}
export function stopLocalRuntime(){if(llamaProcess&&!llamaProcess.killed)llamaProcess.kill("SIGTERM");llamaProcess=null;}
