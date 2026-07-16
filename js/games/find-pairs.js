class FindPairsGame {
    constructor(container, onWin) { this.container=container; this.onWin=onWin; this.symbols=['ᚨ','ᛒ','ᚹ','ᚷ','ᛞ','ᛖ','ᛉ','ᛁ']; this.cards=[]; this.flipped=[]; this.matched=[]; this.lockBoard=false; this.moves=0; this.maxMoves=16; this.init(); }
    init() {
        this.cards = [...this.symbols,...this.symbols];
        this.shuffle(this.cards);
        this.container.innerHTML = `<div class="game-status" id="game-status">Ходов: ${this.moves} / ${this.maxMoves}</div><div class="pairs-grid" id="pairs-grid"></div>`;
        const grid = document.getElementById('pairs-grid');
        this.cards.forEach((s,i)=>{ const c=document.createElement('div'); c.className='pair-card'; c.innerHTML=`<div class="pair-card-inner"><div class="pair-card-front"></div><div class="pair-card-back">${s}</div></div>`; c.addEventListener('click',()=>this.flip(i,c)); grid.appendChild(c); });
    }
    shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }
    flip(idx, card) {
        if(this.lockBoard||this.flipped.length===2||this.matched.includes(idx)||this.flipped.includes(idx)) return;
        card.classList.add('flipped'); this.flipped.push(idx);
        if(this.flipped.length===2){ this.moves++; document.getElementById('game-status').textContent=`Ходов: ${this.moves} / ${this.maxMoves}`; this.checkMatch(); }
    }
    checkMatch() {
        const [i1,i2]=this.flipped;
        if(this.cards[i1]===this.cards[i2]){
            this.matched.push(i1,i2); this.flipped=[];
            document.querySelectorAll('.pair-card')[i1].classList.add('matched');
            document.querySelectorAll('.pair-card')[i2].classList.add('matched');
            if(this.matched.length===this.cards.length){ document.getElementById('game-status').textContent=`Победа! Ходов: ${this.moves}`; setTimeout(()=>this.onWin(true),800); }
        } else {
            this.lockBoard=true;
            setTimeout(()=>{
                document.querySelectorAll('.pair-card')[i1].classList.remove('flipped');
                document.querySelectorAll('.pair-card')[i2].classList.remove('flipped');
                this.flipped=[]; this.lockBoard=false;
                if(this.moves>=this.maxMoves && this.matched.length<this.cards.length){ document.getElementById('game-status').textContent='Попытки кончились!'; setTimeout(()=>this.onWin(false),800); }
            },600);
        }
    }
    cleanup(){}
}
