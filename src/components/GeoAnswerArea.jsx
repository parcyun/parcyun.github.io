export default function GeoAnswerArea({tools,practice,result,mode,config,submit,input,answer,setAnswer,composing,skip,busy,mediaError,summary,nextButton}){return (<div className="gg-answer">{tools}
      {!practice&&<div className="gg-feedback" role="status" aria-live="polite">{result&&!result.skipped&&!result.gain&&<span>{result.text}</span>}</div>}
      {!practice&&mode!=='country'&&<label htmlFor="gg-input">{config.prompt}</label>}
      {!practice&&<form onSubmit={submit}>
        <input ref={input} id="gg-input" aria-label={config.label} value={answer} onChange={e=>setAnswer(e.target.value)} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onKeyDown={e=>{if(e.key==='Enter'&&e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(!e.repeat&&!composing.current&&!e.nativeEvent.isComposing&&e.nativeEvent.keyCode!==229)skip();return;}if(e.key==='Enter'&&(e.nativeEvent.isComposing||e.nativeEvent.keyCode===229))e.preventDefault();}} placeholder={busy?'지도를 살펴보세요…':`${config.label} 입력`} autoComplete="off" spellCheck={false} readOnly={busy||(mediaError&&mode!=='nature')||summary}/>
        <button type="submit" disabled={busy||(mediaError&&mode!=='nature')||summary||!answer.trim()}><span>확인</span><small>ENTER</small></button>
        <button type="button" className="gg-skip" disabled={(busy&&!mediaError)||summary} onClick={skip}><span>넘기기</span><small>SHIFT+ENTER</small></button>
      </form>}
      {practice&&<button ref={nextButton} type="button" className="gg-practice-next" disabled={(busy&&!mediaError)||summary} onClick={skip} onKeyDown={e=>{if(e.key==='Enter'&&e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(!e.repeat)skip();}}}><span>넘기기</span><small>SHIFT+ENTER</small></button>}
    </div>);}
