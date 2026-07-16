class CatchBallsGame {
    constructor(container, onWin) { this.container=container; this.onWin=onWin; this.score=0; this.targetScore=30; this.running=false; this.baskets=[{color:'#c05858',x:60,w:100},{color:'#4a7eb0',x:190,w:100},{color:'#5a9e6f',x:320,w:100}]; this.balls=[]; this.canvas=null; this.ctx=null; this.animId=null; this.draggedBall=null; this.mouseX=0; this.init(); }
    init() {
        this.container.innerHTML = `<div class="game-score" id="catch-score">Очки: 0 / ${this.targetScore}</div><canvas class="catch-canvas" id="catch-canvas" width="480" height="400"></canvas><div class="game-controls"><button class="game-btn-control" id="btn-catch-start">Начать игру</button></div>`;
        this.canvas=document.getElementById('catch-canvas'); this.ctx=this.canvas.getContext('2d');
        this.canvas.addEventListener('mousedown',(e)=>this.onDown(e)); this.canvas.addEventListener('mousemove',(e)=>{ this.mouseX=e.clientX-this.canvas.getBoundingClientRect().left; });
        this.canvas.addEventListener('mouseup',(e)=>this.onUp(e));
        document.getElementById('btn-catch-start').addEventListener('click',()=>this.start());
    }
    start() { if(this.running) return; this.running=true; this.score=0; this.balls=[]; document.getElementById('btn-catch-start').disabled=true; this.loop(); this.spawn(); }
    spawn() { if(!this.running) return; this.balls.push({ x:Math.random()*460+10, y:-15, r:14, speed:0.8+Math.random()*1.5, color:['#c05858','#4a7eb0','#5a9e6f','#c9a84c','#8b6fc0'][Math.floor(Math.random()*5)], isBomb:Math.random()<0.15, grabbed:false }); setTimeout(()=>this.spawn(),700+Math.random()*500); }
    onDown(e) { const rect=this.canvas.getBoundingClientRect(); const mx=e.clientX-rect.left, my=e.clientY-rect.top; for(let i=this.balls.length-1;i>=0;i--){ const b=this.balls[i]; if(Math.hypot(mx-b.x,my-b.y)<b.r){ if(b.isBomb){ this.balls.splice(i,1); this.running=false; cancelAnimationFrame(this.animId); document.getElementById('catch-score').textContent='БОМБА! Игра окончена.'; document.getElementById('btn-catch-start').disabled=false; this.onWin(false); return; } b.grabbed=true; this.draggedBall=b; break; } } }
    onUp(e) { if(!this.draggedBall) return; const rect=this.canvas.getBoundingClientRect(); const mx=e.clientX-rect.left; for(const basket of this.baskets){ if(mx>basket.x && mx<basket.x+basket.w && this.draggedBall.color===basket.color){ this.score++; document.getElementById('catch-score').textContent=`Очки: ${this.score} / ${this.targetScore}`; const idx=this.balls.indexOf(this.draggedBall); if(idx>=0) this.balls.splice(idx,1); if(this.score>=this.targetScore){ this.running=false; cancelAnimationFrame(this.animId); document.getElementById('catch-score').textContent='Победа!'; document.getElementById('btn-catch-start').disabled=false; this.onWin(true); return; } break; } } if(this.draggedBall) this.draggedBall.grabbed=false; this.draggedBall=null; }
    loop() { if(!this.running) return; this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        for(const b of this.baskets){ this.ctx.fillStyle=b.color+'33'; this.ctx.fillRect(b.x,this.canvas.height-50,b.w,40); this.ctx.strokeStyle=b.color; this.ctx.strokeRect(b.x,this.canvas.height-50,b.w,40); this.ctx.font='11px serif'; this.ctx.fillStyle=b.color; this.ctx.textAlign='center'; this.ctx.fillText('Корзина',b.x+b.w/2,this.canvas.height-55); }
        for(let i=this.balls.length-1;i>=0;i--){ const b=this.balls[i]; if(!b.grabbed) b.y+=b.speed; else { b.x=this.mouseX; b.y=this.canvas.height-60; }
            this.ctx.beginPath(); this.ctx.arc(b.x,b.y,b.r,0,Math.PI*2); this.ctx.fillStyle=b.isBomb?'#1a1a1a':b.color; this.ctx.fill(); this.ctx.strokeStyle='#fff3'; this.ctx.stroke();
            if(b.isBomb){ this.ctx.font='12px serif'; this.ctx.fillStyle='#fff'; this.ctx.textAlign='center'; this.ctx.fillText('☠',b.x,b.y+4); }
            if(b.y-b.r>this.canvas.height) this.balls.splice(i,1);
        }
        this.animId=requestAnimationFrame(()=>this.loop());
    }
    cleanup(){ this.running=false; if(this.animId) cancelAnimationFrame(this.animId); }
}
