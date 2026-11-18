import './scoring.js';

export function scoreAnswer(answer, elapsedSeconds, tier, comboCount, hintUsed = false) {
  let strokes=0;for(const ch of answer)strokes+=/[가-힣]/.test(ch)?2.5:1;
  const ratio=elapsedSeconds/(strokes/6+1.5);
  const speedBonus=ratio<=.9?100:ratio<=1.15?50:ratio<=1.5?20:0;
  return {...globalThis.SpellScoring.calculateCorrectGain({baseScore:globalThis.SpellScoring.baseScoreForDifficulty(tier),speedBonus,comboCount,hintUsed}),
    speedTag:speedBonus===100?'LIGHTNING':speedBonus===50?'FAST':speedBonus===20?'QUICK':''};
}
