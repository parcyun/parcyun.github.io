import {test} from 'node:test';
import assert from 'node:assert/strict';
import {finishOnHidden,tabExitMessage,TAB_EXIT_MESSAGES} from '../src/components/geoRoundVisibility.js';
test('leaving the game finishes once and returning never resumes; cleanup removes listener',()=>{const doc=new EventTarget();doc.visibilityState='visible';let calls=0;const dispose=finishOnHidden(doc,()=>calls++);doc.dispatchEvent(new Event('visibilitychange'));assert.equal(calls,0);doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));assert.equal(calls,1);doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));assert.equal(calls,1);dispose();doc.dispatchEvent(new Event('visibilitychange'));assert.equal(calls,1);});

test('all ten playful messages can be selected',()=>{assert.equal(new Set(TAB_EXIT_MESSAGES).size,10);for(let i=0;i<10;i++)assert.equal(tabExitMessage(()=>i/10),TAB_EXIT_MESSAGES[i]);});
