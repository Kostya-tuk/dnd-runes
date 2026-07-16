class TimerGame {
    constructor(container, onWin) { this.container=container; this.onWin=onWin; this.targetTime=0; this.startTime=0; this.elapsed=0; this.running=false; this.covered=false; this.timerInterval=null; this.init(); }
    init() {
        this.targetTime = 5 + Math.random()*25;
        this.container.innerHTML = `<div class="game-status">Остановите на <strong>${this.targetTime.toFixed(2)}</strong> сек</div><div class="timer-display" id="timer-display">0.00</div><div class="timer-blanket" id="timer-blanket" style="display:none;"></div><div class="game-controls"><button class="game-btn-control" id="btn-timer-start">Старт</button><button class="game-btn-control" id="btn-timer-stop" disabled>Стоп</button><button class="game-btn-control" id="btn-timer-reset">Сброс</button></div>`;
        document.getElementById('btn-timer-start').addEventListener('click',()=>this.start());
        document.getElementById('btn-timer-stop').addEventListener('click',()=>this.stop());
        document.getElementById('btn-timer-reset').addEventListener('click',()=>this.reset());
    }
    start() {
        if(this.running) return; this.running=true; this.covered=false;
        this.startTime=Date.now(); document.getElementById('btn-timer-start').disabled=true; document.getElementById('btn-timer-stop').disabled=false;
        document.getElementById('timer-blanket').style.display='none'; document.getElementById('timer-display').textContent='0.00';
        this.timerInterval = setInterval(()=>{
            this.elapsed=(Date.now()-this.startTime)/1000;
            document.getElementById('timer-display').textContent=this.elapsed.toFixed(2);
            if(this.elapsed>=1.0 && !this.covered){ this.covered=true; document.getElementById('timer-blanket').style.display='flex'; }
        },10);
    }
    stop() {
        if(!this.running) return; this.running=false; clearInterval(this.timerInterval);
        this.elapsed=(Date.now()-this.startTime)/1000;
        document.getElementById('timer-blanket').style.display='none';
        document.getElementById('timer-display').textContent=this.elapsed.toFixed(2);
        document.getElementById('btn-timer-start').disabled=false; document.getElementById('btn-timer-stop').disabled=true;
        const diff=Math.abs(this.elapsed-this.targetTime);
        if(diff<=0.01){ document.querySelector('.game-status').textContent='Закрою глаза — засчитываю!'; setTimeout(()=>this.onWin(true),1500); }
        else { document.querySelector('.game-status').textContent=`Разница: ${diff.toFixed(2)} сек. Попробуйте ещё.`; }
    }
    reset() { this.running=false; clearInterval(this.timerInterval); this.elapsed=0; this.covered=false; document.getElementById('timer-display').textContent='0.00'; document.getElementById('btn-timer-start').disabled=false; document.getElementById('btn-timer-stop').disabled=true; document.getElementById('timer-blanket').style.display='none'; this.targetTime=5+Math.random()*25; document.querySelector('.game-status').innerHTML=`Остановите на <strong>${this.targetTime.toFixed(2)}</strong> сек`; }
    cleanup(){ clearInterval(this.timerInterval); }
}
