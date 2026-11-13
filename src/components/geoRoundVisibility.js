export const TAB_EXIT_MESSAGES = [
 '이런… 그건 반칙이죠.',
 '어허, 정답을 찾으러 잠깐 다녀오셨나요?',
 '탐험가님, 지도 밖으로 나가면 이번 탐험은 끝이에요!',
 '앗, 다른 탭으로 순간 이동! 이번 판은 여기까지예요.',
 '검색 요정은 이번 게임에 초대하지 않았어요.',
 '잠깐! 정답은 검색창 말고 머릿속에서 찾아봐요.',
 '쉿, 다른 탭이 답을 알려주기 전에 게임을 마쳤어요.',
 '어라? 탐험가님이 자리를 비워서 탐험을 마쳤어요.',
 '탭 넘기기는 여기까지! 다음 판은 기억력으로 도전해 봐요.',
 '앗, 비밀 작전이 들켰네요. 다음 판은 정정당당하게!'
];
export const tabExitMessage = (random = Math.random) => TAB_EXIT_MESSAGES[Math.floor(random()*TAB_EXIT_MESSAGES.length)];
export function finishOnHidden(document,finish){let finished=false;const changed=()=>{if(document.visibilityState==='hidden'&&!finished){finished=true;finish();}};document.addEventListener('visibilitychange',changed);changed();return()=>document.removeEventListener('visibilitychange',changed);}
