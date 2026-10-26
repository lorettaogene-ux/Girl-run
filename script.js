(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const screens = ['titleScreen','pauseScreen','overScreen','wardrobeScreen'];
  const hud = $('topHud'), controls = $('mobileControls'), tip = $('gameTip');
  let W=0,H=0,dpr=1, state='title', last=0, elapsed=0, score=0, coins=0, speed=330;
  let lane=1, playerX=0, jump=0, jumpV=0, runPhase=0, objects=[], particles=[], spawnTimer=0, roadOffset=0, look='pink', best=0;
  const colors={pink:{main:'#ff65ad',dark:'#df438f',light:'#ffc2e1'},lilac:{main:'#b28aff',dark:'#8a62d8',light:'#e3d3ff'},mint:{main:'#67d8bf',dark:'#36ae9c',light:'#c5fff0'}};
  const rand=(a,b)=>a+Math.random()*(b-a);
  function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);W=r.width;H=r.height;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);playerX=laneX(lane);}
  window.addEventListener('resize',resize); resize();
  function laneX(l){return W*(.29+l*.21)}
  function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
  function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill()}
  function background(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#ffb9dd');sky.addColorStop(.55,'#ffd7ed');sky.addColorStop(1,'#ffb2da');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    // glowing clouds and distant candy city
    for(let i=0;i<5;i++){let x=((i*117+elapsed*7)%(W+150))-60,y=H*(.14+(i%3)*.09);ctx.globalAlpha=.42;ellipse(x,y,43,15,'#fff8fd');ellipse(x+20,y-7,24,18,'#fff8fd');ellipse(x-20,y-4,22,13,'#fff8fd');}ctx.globalAlpha=1;
    for(let i=0;i<8;i++){let bw=W/7+8,x=i*bw-5,y=H*.37+(i%3)*12;rounded(x,y,bw-7,H*.34,12,['#f58cc2','#f9a6cf','#e9a6e7'][i%3]);for(let wy=y+17;wy<H*.65;wy+=24)for(let wx=x+12;wx<x+bw-15;wx+=20)rounded(wx,wy,8,10,'#ffe7f5');}
    // candy trees
    for(let i=0;i<7;i++){let x=i*W/6+((i%2)*8),y=H*.56;rounded(x-4,y,8,30,'#c77aab');ellipse(x,y-8,20,23,['#ff8dc6','#f7b2d8','#c5a1f2'][i%3]);ellipse(x-8,y-16,11,13,'#ffd4e9');}
    // road perspective
    ctx.beginPath();ctx.moveTo(W*.34,H*.49);ctx.lineTo(W*.66,H*.49);ctx.lineTo(W*1.06,H);ctx.lineTo(-W*.06,H);ctx.closePath();let road=ctx.createLinearGradient(0,H*.5,0,H);road.addColorStop(0,'#d98bbd');road.addColorStop(1,'#b86ba4');ctx.fillStyle=road;ctx.fill();
    // edge trim
    ctx.strokeStyle='#fff0fa';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(W*.34,H*.49);ctx.lineTo(-W*.06,H);ctx.moveTo(W*.66,H*.49);ctx.lineTo(W*1.06,H);ctx.stroke();
    // three lanes perspective dividers
    ctx.strokeStyle='rgba(255,239,250,.65)';ctx.lineWidth=3;ctx.setLineDash([18,20]);ctx.lineDashOffset=-roadOffset%38;
    ctx.beginPath();ctx.moveTo(W*.447,H*.49);ctx.lineTo(W*.33,H);ctx.moveTo(W*.553,H*.49);ctx.lineTo(W*.67,H);ctx.stroke();ctx.setLineDash([]);
    // road glitter
    for(let i=0;i<16;i++){let y=((i*67+roadOffset*1.3)%(H*.53))+H*.47;let p=(y-H*.47)/(H*.53);let x=W*(.34+p*.66)+Math.sin(i*9)*W*.15;ctx.globalAlpha=.4;drawStar(x,y,rand(2,4)*p,'#fff4fb');}ctx.globalAlpha=1;
  }
  function drawStar(x,y,r,color){ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<10;i++){let a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill();ctx.restore()}
  function drawCoin(o){let s=o.scale;ctx.save();ctx.translate(o.x,o.y);ctx.scale(s,s);ellipse(0,3,13,15,'#c77a47');ellipse(0,0,12,14,'#ffcb55');ellipse(-2,-2,7,9,'#ffeaa0');drawStar(0,0,6,'#fff9c6');ctx.restore()}
  function drawObstacle(o){let s=o.scale;ctx.save();ctx.translate(o.x,o.y);ctx.scale(s,s);
    if(o.type==='puddle'){ellipse(0,8,28,11,'#a0d8ef');ellipse(-5,4,17,5,'#d9f6ff');}
    else if(o.type==='bear'){ellipse(0,0,23,24,'#bd8be5');ellipse(-15,-16,9,10,'#bd8be5');ellipse(15,-16,9,10,'#bd8be5');ellipse(-15,-16,4,5,'#f8c5e5');ellipse(15,-16,4,5,'#f8c5e5');ellipse(0,4,12,10,'#fce8ff');ellipse(-6,-3,2.5,3,'#59334f');ellipse(6,-3,2.5,3,'#59334f');ellipse(0,2,3,2,'#754267');}
    else {rounded(-21,-25,42,48,10,'#ff8abf','#fff1fa');rounded(-16,-20,32,38,7,'#ffb5d8');drawStar(0,-2,11,'#fff3fa');}
    ctx.restore();
  }
  function drawGirl(x,y,scale=1){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    const c=colors[look]||colors.pink;let bob=Math.sin(runPhase*12)*3, leg=Math.sin(runPhase*12)*10;
    // shadow
    ellipse(0,5,29,8,'#8d477b55');
    // legs + sneakers
    ctx.save();ctx.translate(-11,-27);ctx.rotate(-leg*.018);rounded(-8,-2,17,30,8,'#8b503d','#60352f');rounded(-13,21,27,13,7,'#fff7fc','#e45b9e');rounded(-11,22,16,3,2,c.main);ctx.restore();
    ctx.save();ctx.translate(11,-27);ctx.rotate(leg*.018);rounded(-8,-2,17,30,8,'#8b503d','#60352f');rounded(-13,21,27,13,7,'#fff7fc','#e45b9e');rounded(-11,22,16,3,2,c.main);ctx.restore();
    // arms behind body
    ctx.save();ctx.translate(-22,-66);ctx.rotate(-.25+Math.sin(runPhase*12)*.18);rounded(-7,-2,15,38,8,'#8b503d','#60352f');ctx.restore();
    ctx.save();ctx.translate(22,-66);ctx.rotate(.25-Math.sin(runPhase*12)*.18);rounded(-7,-2,15,38,8,'#8b503d','#60352f');ctx.restore();
    // hair silhouette + puff curls
    ellipse(0,-94+bob,34,33,'#32223a');for(let i=0;i<9;i++){let a=i*Math.PI*2/9;ellipse(Math.cos(a)*29,-98+bob+Math.sin(a)*23,10,11,'#32223a')}
    // ears
    ellipse(-26,-87+bob,7,10,'#8b503d');ellipse(26,-87+bob,7,10,'#8b503d');
    // face
    ellipse(0,-88+bob,27,31,'#9c6047');ellipse(-7,-98+bob,6,8,'#b7785c');
    // bangs
    ctx.beginPath();ctx.moveTo(-25,-101+bob);ctx.quadraticCurveTo(-23,-128+bob,0,-119+bob);ctx.quadraticCurveTo(23,-125+bob,25,-99+bob);ctx.quadraticCurveTo(12,-105+bob,6,-96+bob);ctx.quadraticCurveTo(-3,-104+bob,-10,-96+bob);ctx.quadraticCurveTo(-17,-102+bob,-25,-101+bob);ctx.fillStyle='#32223a';ctx.fill();
    // headphones
    ctx.strokeStyle='#ff66ad';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,-96+bob,31,Math.PI,Math.PI*2);ctx.stroke();rounded(-33,-97+bob,10,20,5,'#ff66ad','#fff0f8');rounded(23,-97+bob,10,20,5,'#ff66ad','#fff0f8');
    // face details
    ellipse(-10,-87+bob,2.5,4,'#2b1a2b');ellipse(10,-87+bob,2.5,4,'#2b1a2b');ellipse(-16,-78+bob,6,3,'#e8798c');ellipse(16,-78+bob,6,3,'#e8798c');
    ctx.strokeStyle='#603348';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-77+bob,5,.15,Math.PI-.15);ctx.stroke();
    // hoodie body, round cute silhouette
    rounded(-29,-65+bob,58,48,18,c.main,c.dark);rounded(-22,-69+bob,44,17,10,c.light,c.dark);rounded(-7,-49+bob,14,18,5,c.dark);
    // heart emblem
    ctx.fillStyle='#fff4fa';ctx.font='bold 17px sans-serif';ctx.textAlign='center';ctx.fillText('♥',0,-38+bob);
    // backpack straps and bag
    rounded(-33,-60+bob,9,31,5,'#d95d9f');rounded(24,-60+bob,9,31,5,'#d95d9f');rounded(23,-57+bob,17,25,7,c.dark,'#fff0f8');drawStar(31,-46+bob,5,'#fff0f8');
    // hair beads
    ellipse(-29,-111+bob,5,5,'#ff8fc8');ellipse(29,-111+bob,5,5,'#ff8fc8');
    ctx.restore();
  }
  function drawWorld(){
    background();
    // depth-sorted items
    objects.forEach(o=>{if(o.type==='coin')drawCoin(o);else drawObstacle(o)});
    let px=laneX(lane);if(state==='running')playerX+=(px-playerX)*.22;else playerX=px;
    let py=H*.78-jump;let scale=.75+(py/H)*.32;
    drawGirl(playerX,py,scale);
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/p.max);drawStar(p.x,p.y,p.r,p.color)});ctx.globalAlpha=1;
  }
  function spawn(){let laneNum=Math.floor(Math.random()*3);let y=H*.47;let x=laneX(laneNum);let type=Math.random()<.34?'coin':(['puddle','bear','gift'][Math.floor(Math.random()*3)]);if(type==='coin'&&Math.random()<.55){for(let i=0;i<4;i++)objects.push({type:'coin',lane:laneNum,x,y:y-i*29,scale:.35,hit:false})}else objects.push({type,lane:laneNum,x,y,scale:.4,hit:false})}
  function update(dt){
    elapsed+=dt;runPhase+=dt;roadOffset+=speed*dt*.65;speed=Math.min(560,330+elapsed*3);
    if(state!=='running')return;
    score+=dt*12;spawnTimer-=dt;if(spawnTimer<=0){spawn();spawnTimer=rand(.55,.95)*Math.max(.65,1-elapsed*.006)}
    jump=Math.max(0,jump+jumpV*dt);jumpV-=1050*dt;if(jump<0){jump=0;jumpV=0}
    objects.forEach(o=>{let p=(o.y-H*.47)/(H*.53);o.y+=speed*dt*(.55+p*.95);o.scale=.35+p*.9;o.x=laneX(o.lane)+(o.lane-1)*p*W*.07; if(!o.hit&&p>.77&&p<.93&&o.lane===lane){if(o.type==='coin'){o.hit=true;coins++;for(let i=0;i<7;i++)particles.push({x:o.x,y:o.y,life:.6,max:.6,r:rand(2,6),color:['#fff5a8','#fff','#ff8cc8'][i%3]})}else if(jump<36){o.hit=true;endGame()}}});
    objects=objects.filter(o=>o.y<H+70&&!o.hit);particles.forEach(p=>{p.life-=dt;p.y-=35*dt});particles=particles.filter(p=>p.life>0);
    $('score').textContent=String(Math.floor(score)).padStart(6,'0');$('coins').textContent=coins;
  }
  function loop(t){let dt=Math.min(.035,(t-last)/1000||0);last=t;update(dt);drawWorld();requestAnimationFrame(loop)}
  requestAnimationFrame(loop);
  function showScreen(name){screens.forEach(s=>$(s).classList.toggle('hidden',s!==name));}
  function startGame(){score=0;coins=0;elapsed=0;speed=330;lane=1;playerX=laneX(lane);jump=0;jumpV=0;objects=[];particles=[];spawnTimer=.8;state='running';showScreen('');hud.classList.remove('hidden');controls.classList.remove('hidden');tip.classList.remove('hidden');$('score').textContent='000000';$('coins').textContent='0';}
  function endGame(){if(state!=='running')return;state='over';best=Math.max(best,Math.floor(score));$('finalScore').textContent=Math.floor(score);$('finalCoins').textContent=coins;showScreen('overScreen');controls.classList.add('hidden');tip.classList.add('hidden');}
  function pause(){if(state!=='running')return;state='paused';showScreen('pauseScreen');}
  function resume(){state='running';showScreen('');}
  function goHome(){state='title';showScreen('titleScreen');hud.classList.add('hidden');controls.classList.add('hidden');tip.classList.add('hidden');}
  function move(d){if(state!=='running')return;lane=Math.max(0,Math.min(2,lane+d))}
  function doJump(){if(state==='running'&&jump===0){jumpV=420}}
  $('playBtn').addEventListener('click',startGame);$('againBtn').addEventListener('click',startGame);$('homeBtn').addEventListener('click',goHome);$('pauseBtn').addEventListener('click',pause);$('resumeBtn').addEventListener('click',resume);$('pauseHomeBtn').addEventListener('click',goHome);
  $('wardrobeBtn').addEventListener('click',()=>{state='wardrobe';showScreen('wardrobeScreen')});$('wardrobeBack').addEventListener('click',()=>{state='title';showScreen('titleScreen')});$('wardrobePlay').addEventListener('click',startGame);
  document.querySelectorAll('.outfit').forEach(b=>b.addEventListener('click',()=>{look=b.dataset.look;document.querySelectorAll('.outfit').forEach(x=>x.classList.toggle('selected',x===b));$('wardrobeGirl').style.setProperty('--outfit',colors[look].main);$('wardrobeGirl').querySelector('.hoodie').style.background=`linear-gradient(135deg,${colors[look].light},${colors[look].main})`; $('wardrobeGirl').querySelector('.hoodie').style.borderColor=colors[look].dark;}));
  $('leftBtn').addEventListener('pointerdown',e=>{e.preventDefault();move(-1)});$('rightBtn').addEventListener('pointerdown',e=>{e.preventDefault();move(1)});$('jumpBtn').addEventListener('pointerdown',e=>{e.preventDefault();doJump()});
  window.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='a')move(-1);if(e.key==='ArrowRight'||e.key==='d')move(1);if(e.key==='ArrowUp'||e.key===' '){e.preventDefault();doJump()}if(e.key==='Escape'){if(state==='running')pause();else if(state==='paused')resume()}});
  let sx=0,sy=0;canvas.addEventListener('touchstart',e=>{sx=e.changedTouches[0].clientX;sy=e.changedTouches[0].clientY},{passive:true});canvas.addEventListener('touchend',e=>{if(state!=='running')return;let dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)>28)move(dx>0?1:-1);else if(dy<-25)doJump()},{passive:true});
  hud.classList.add('hidden');
})();