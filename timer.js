class MemoryColorsGame {
    constructor(container, onWin) { this.container=container; this.onWin=onWin; this.colors=['#c05858','#5a9e6f','#4a7eb0','#c9a84c','#8b6fc0','#c0608b']; this.sequence=[]; this.playerSequence=[]; this.showingSequence=false; this.round=1; this.init(); }
    init() {
        this.container.innerHTML = `<div class="game-status" id="game-status">Раунд ${this.round}</div><div class="color-grid" id="color-grid"></div><div class="game-controls"><button class="game-btn-control" id="btn-start">Начать раунд</button></div>`;
        document.getElementById('color-grid').innerHTML = this.colors.map((c,i)=>`<button class="color-btn" style="background:${c}" data-idx="${i}"></button>`).join('');
        document.querySelectorAll('.color-btn').forEach(b=>b.addEventListener('click',(e)=>this.onClick(parseInt(e.target.dataset.idx))));
        document.getElementById('btn-start').addEventListener('click',()=>this.startRound());
    }
    startRound() { this.showingSequence=true; this.playerSequence=[]; this.sequence=Array.from({length:this.round+2},()=>Math.floor(Math.random()*this.colors.length)); document.getElementById('game-status').textContent=`Раунд ${this.round} — Запоминайте...`; this.showSeq(0); }
    showSeq(i) { if(i>=this.sequence.length){ this.showingSequence=false; document.getElementById('game-status').textContent=`Раунд ${this.round} — Повторите!`; return; } setTimeout(()=>{ document.querySelectorAll('.color-btn')[this.sequence[i]].classList.add('active'); setTimeout(()=>{ document.querySelectorAll('.color-btn')[this.sequence[i]].classList.remove('active'); setTimeout(()=>this.showSeq(i+1),200); },400); },300); }
    onClick(idx) { if(this.showingSequence) return; this.playerSequence.push(idx); if(this.playerSequence[this.playerSequence.length-1]!==this.sequence[this.playerSequence.length-1]){ document.getElementById('game-status').textContent='Неверно! Игра окончена.'; setTimeout(()=>this.onWin(false),1000); return; } if(this.playerSequence.length===this.sequence.length){ if(this.round>=3){ document.getElementById('game-status').textContent='Победа!'; setTimeout(()=>this.onWin(true),1000); } else { this.round++; document.getElementById('game-status').textContent=`Правильно! Раунд ${this.round}`; setTimeout(()=>this.startRound(),1500); } } }
    cleanup(){}
}
