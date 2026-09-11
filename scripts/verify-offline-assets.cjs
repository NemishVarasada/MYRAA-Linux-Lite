const fs=require('fs');const path=require('path');
const required={
  'local_ai/bin/llama-server':1_000_000,
  'local_ai/bin/whisper-cli':1_000_000,
  'local_ai/bin/piper':500_000,
  'local_ai/models/assistant.gguf':500_000_000,
  'local_ai/models/whisper.bin':100_000_000,
  'local_ai/models/voice.onnx':1_000_000,
  'local_ai/models/voice.onnx.json':100,
};
let failed=false,total=0;
for(const [file,min] of Object.entries(required)){
  const full=path.resolve(file);
  if(!fs.existsSync(full)){console.error(`Missing offline asset: ${file}`);failed=true;continue}
  const size=fs.statSync(full).size;total+=size;if(size<min){console.error(`Offline asset looks incomplete: ${file} (${size} bytes)`);failed=true}
}
if(failed){console.error('\nOffline package stopped. Add the licensed runtime binaries and model files listed in local_ai/README.md.');process.exit(1)}
console.log(`Offline assets verified (${(total/1024/1024/1024).toFixed(2)} GiB).`);
