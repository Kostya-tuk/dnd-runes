class CupsGame {
    constructor(container, onWin) { this.container=container; this.onWin=onWin; this.cupsCount=5; this.ballPosition=-1; this.shuffling=false; this.chosen=-1; this.phase='reveal'; this.init(); }
    init() {
        this.ballPosition = Math.floor(Math.random()*this.cupsCount);
        this.container.innerHTML = `<div class="game-status" id="game-status">Смотрите, где красный шарик...</div><div class="cups-container" id="cups-container"></div><div class="game-controls"><button class="game-btn-control" id="btn-shuffle" disabled>Перемешать</button><button class="game-btn-control" id="btn-reset">Заново</button></div>`;
        this.renderCups(true);
        document.getElementById('btn-shuffle').addEventListener('click',()=>this.shuffle());
        document.getElementById('btn-reset').addEventListener('click',()=>{ this.ballPosition=Math.floor(Math.random()*this.cupsCount); this.chosen=-1; this.phase='reveal'; this.renderCups(true); document.getElementById('btn-shuffle').disabled=true; document.getElementById('game-status').textContent='Смотрите, где красный шарик...'; });
        setTimeout(()=>{ this.phase='hidden'; this.renderCups(false); document.getElementById('btn-shuffle').disabled=false; document.getElementById('game-status').textContent='Перемешайте стаканчики!'; }, 2000);
    }
    renderCups(showBall) {
        document.getElementById('cups-container').innerHTML = Array.from({length:this.cupsCount},(_,i)=>`<div class="cup${this.chosen===i?' revealed':''}${showBall&&i===this.ballPosition?' has-ball':''}"></div>`).join('');
        document.querySelectorAll('.cup').forEach((c,i)=>c.addEventListener('click',()=>{ if(this.shuffling||this.phase==='reveal') return; this.chosen=i; this.renderCups(false); if(i===this.ballPosition){ document.getElementById('game-status').textContent='Верно! Красный мячик здесь.'; setTimeout(()=>this.onWin(true),1000); } else { document.getElementById('game-status').textContent='Неверно! Попробуйте ещё.'; } }));
    }
    async shuffle() {
        if(this.shuffling) return; this.shuffling=true; this.chosen=-1; document.getElementById('game-status').textContent='Перемешиваю...';
        for(let s=0;s<12;s++){ const i1=Math.floor(Math.random()*this.cupsCount); const i2=Math.floor(Math.random()*this.cupsCount); if(i1===this.ballPosition) this.ballPosition=i2; else if(i2===this.ballPosition) this.ballPosition=i1; await this.animateSwap(i1,i2); }
        this.shuffling=false; document.getElementById('game-status').textContent='Выберите стаканчик!';
    }
    async animateSwap(i1,i2){ const cups=document.querySelectorAll('.cup'); const x1=cups[i1].getBoundingClientRect().x, x2=cups[i2].getBoundingClientRect().x; const dx=x2-x1; cups[i1].style.transition='transform 0.3s'; cups[i2].style.transition='transform 0.3s'; cups[i1].style.transform=`translateX(${dx}px)`; cups[i2].style.transform=`translateX(${-dx}px)`; await new Promise(r=>setTimeout(r,300)); cups[i1].style.transform=''; cups[i2].style.transform=''; const parent=cups[i1].parentNode; parent.insertBefore(cups[i2],cups[i1]); }
    cleanup(){}
}
