import fs from "node:fs/promises";
import path from "node:path";
import {spawn} from "node:child_process";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {createScore} from "./score.mjs";
import {findBrowser} from "../../gui/e2e/browser.mjs";

const repo=path.resolve(fileURLToPath(new URL("../../",import.meta.url)));
const outDir=path.join(repo,".agent-work","film-delivery");
const work=path.join(repo,".agent-work","film-jobs");
const cli=path.join(repo,"dist","cli","main.js");
const report={schema:"cinematic-film/1",title:"今見ている月は、1.3秒前の月だ",duration_sec:62,
  format:"1920x1080/30p",producer:"Shin-MotionMaker / Remotion",publish:false,editorial_review:"unreviewed",
  source_commit:process.env.GITHUB_SHA??null,steps:[],status:"failed"};
function call(argv,cwd=repo,inherit=false,env={}){
 return new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,argv,{cwd,env:{...process.env,...env},shell:false,windowsHide:true,stdio:["ignore","pipe","pipe"]});
   let stdout="",stderr="";
   child.stdout.on("data",b=>{stdout+=b; if(inherit)process.stdout.write(b);});
   child.stderr.on("data",b=>{stderr+=b; if(inherit)process.stderr.write(b);});
   child.once("error",reject);
   child.once("close",code=>resolve({code,stdout,stderr}));
 });
}
async function smm(args){
 const r=await call([cli,...args]);
 let payload;
 try {payload=JSON.parse(r.stdout);} catch {throw Error("Invalid SMM JSON for "+args[0]+": "+r.stderr.slice(-1000));}
 if(r.code!==0 || !payload.ok)throw Error("SMM "+args[0]+" rejected: "+JSON.stringify(payload.error||{}).slice(0,1000));
 return payload;
}
async function stage(name,job,args=[]){
 let payload=await smm([name,job,...args,"--wait-ms","50000"]);
 const id=payload.run?.id;if(!id)throw Error("No SMM process receipt for "+name);
 let polls=0;
 while(payload.run?.status==="running"){
   if(++polls>90)throw Error(name+" exceeded 75 minutes");
   payload=await smm(["runs","get",job,id,"--wait-ms","50000"]);
 }
 const r={name,status:payload.run?.status,exit_code:payload.run?.exit_code,verdict:payload.result?.verdict??null};
 report.steps.push(r);
 if(r.status!=="completed"||r.exit_code!==0||r.verdict==="fail")throw Error("Stage failed: "+JSON.stringify(r));
 return payload;
}
async function sha(file){const b=await fs.readFile(file);return {size:b.length,sha256:createHash("sha256").update(b).digest("hex")};}
async function main(){
 await fs.mkdir(outDir,{recursive:true});
 const g=await smm(["generate","films/moonlight/request.json","--out",".agent-work/film-jobs"]);
 if(!g.result?.job)throw Error("Generation returned no job");
 const job=g.result.job, folder=path.resolve(repo,job);
 if(!folder.startsWith(work+path.sep))throw Error("Unexpected SMM job path");
 report.generator=g.result.project?.generator||null;
 await fs.copyFile(path.join(repo,"films/moonlight/Scene001.tsx"),path.join(folder,"scenes/Scene001.tsx"));
 await fs.copyFile(path.join(repo,"films/moonlight/index.tsx"),path.join(folder,"scenes/index.tsx"));
 const projectFile=path.join(folder,"project.json");
 const project=JSON.parse(await fs.readFile(projectFile,"utf8"));
 project.video.target_duration_sec=62;
 project.scenes=[{id:"film001",script:"月の光は約1.3秒かけて地球に届く。太陽は約8分20秒。宇宙を見ることは過去を見ること。",duration_sec:62,biim:false,style_mode:"motion"}];
 project.voice.engine="none";project.direction.character_usage="none";
 project.audio.generate_bgm_se=false;project.audio.bgm="assets/audio/original-score.wav";project.audio.bgm_volume=1;
 await fs.writeFile(projectFile,JSON.stringify(project,null,2)+"\n");
 const music=await createScore(path.join(folder,"assets/audio/original-score.wav"));
 report.score=music;report.steps.push({name:"original-audio",status:"completed",bytes:music.bytes});
 await fs.appendFile(path.join(folder,"runtime/remotion.config.ts"),"\nConfig.setBrowserExecutable("+JSON.stringify(findBrowser())+");\nConfig.setConcurrency(3);\n");
 await stage("setup",job);
 await stage("validate",job);
 await stage("render",job,["--target","preview"]);
 await stage("render",job,["--target","final"]);
 const final=path.join(folder,"output/final.mp4"),preview=path.join(folder,"output/preview.mp4");
 const finalHash=await sha(final);
 if(finalHash.size<150000)throw Error("Suspiciously small MP4");
 await fs.copyFile(final,path.join(outDir,"final.mp4"));
 await fs.copyFile(preview,path.join(outDir,"preview.mp4"));
 await fs.copyFile(path.join(folder,"assets/audio/original-score.wav"),path.join(outDir,"original-score.wav"));
 report.final={file:"final.mp4",...finalHash};
 report.preview={file:"preview.mp4",...await sha(preview)};
 report.status="rendered";report.note="Technical rendering completed; watch/listen before publishing. No YouTube upload was performed.";
}
try{await main();console.log("FILM_RENDER_SUCCESS");}
catch(e){report.error=e instanceof Error?e.message:String(e);console.error(report.error);process.exitCode=1;}
finally{
 await fs.mkdir(outDir,{recursive:true});
 await fs.writeFile(path.join(outDir,"report.json"),JSON.stringify(report,null,2)+"\n");
}
