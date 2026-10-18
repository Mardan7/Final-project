const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const app = require('../index');
const output = path.resolve(__dirname,'../../evidence');
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'bookstore-'));
function curl(args) {
  return new Promise((resolve,reject)=>{
    const child = spawn(process.platform==='win32'?'curl.exe':'curl',args);
    let out='',err='';
    child.stdout.on('data',chunk=>out+=chunk);
    child.stderr.on('data',chunk=>err+=chunk);
    child.on('error',reject);
    child.on('close',code=>code===0?resolve(out):reject(new Error(err)));
  });
}
async function capture(name,args,display=args) {
  const result = await curl(args);
  fs.writeFileSync(path.join(output,name),'curl '+display.map(s=>/\s/.test(s)?JSON.stringify(s):s).join(' ')+'\n\n'+result+'\n');
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const server = app.listen(5000,'127.0.0.1');
  await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  const base = 'http://127.0.0.1:5000';
  const jar = path.join(temp,'cookies.txt');
  const credentials = path.join(temp,'credentials.json');
  fs.writeFileSync(credentials,JSON.stringify({username:'student_demo',password:'BookReviewDemo123!'}));
  fs.copyFileSync(credentials,path.join(output,'credentials.json'));
  try {
    for (const [name,route] of [['getallbooks','/'],['getbooksbyISBN','/isbn/1'],['getbooksbyauthor','/author/Unknown'],['getbooksbytitle','/title/Things%20Fall%20Apart'],['getbookreview','/review/1']]) await capture(name,['-sS',base+route]);
    await capture('register',['-sS','-X','POST',base+'/register','-H','Content-Type: application/json','--data-binary','@'+credentials],['-sS','-X','POST',base+'/register','-H','Content-Type: application/json','--data-binary','@credentials.json']);
    await capture('login',['-sS','-c',jar,'-X','POST',base+'/customer/login','-H','Content-Type: application/json','--data-binary','@'+credentials],['-sS','-c','cookies.txt','-X','POST',base+'/customer/login','-H','Content-Type: application/json','--data-binary','@credentials.json']);
    await capture('reviewadded',['-sS','-b',jar,'-X','PUT',base+'/customer/auth/review/1?review=A%20thoughtful%20and%20powerful%20novel'],['-sS','-b','cookies.txt','-X','PUT',base+'/customer/auth/review/1?review=A%20thoughtful%20and%20powerful%20novel']);
    await capture('deletereview',['-sS','-b',jar,'-X','DELETE',base+'/customer/auth/review/1'],['-sS','-b','cookies.txt','-X','DELETE',base+'/customer/auth/review/1']);
    const repo = process.env.EVIDENCE_REPO || 'Mardan7/Final-project';
    await capture('githubrepo',['-sS','https://api.github.com/repos/'+repo]);
    console.log('Captured actual cURL output in '+output);
  } finally {
    await new Promise(resolve=>server.close(resolve));
    fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
