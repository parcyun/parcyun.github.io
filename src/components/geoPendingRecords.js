import {GAME_MODES} from './geoGameData.js';
import {difficultyOptions,hasGameDifficulty} from './geoGameDifficulty.js';
export const PENDING_RECORD_KEY='geoweb.pending-records.v1';
export const pendingBoardKey=(mode,diff)=>`${mode}:${diff||'legacy'}`;
export function betterRecord(next,previous){return !previous||next.score>previous.score||(next.score===previous.score&&next.elapsedMs<previous.elapsedMs);}
function valid(record){return record&&GAME_MODES.some(m=>m.id===record.mode)&&(!hasGameDifficulty(record.mode)||difficultyOptions(record.mode).some(d=>d.id===record.diff))&&Number.isFinite(record.score)&&record.score>0&&Number.isFinite(record.elapsedMs)&&record.elapsedMs>=1000&&Number.isFinite(record.playedAt)&&record.playedAt>0;}
export function readPendingRecords(storage){try{const data=JSON.parse(storage.getItem(PENDING_RECORD_KEY)||'{}');return Object.fromEntries(Object.entries(data).filter(([key,r])=>valid(r)&&key===pendingBoardKey(r.mode,r.diff)));}catch{return {};}}
export function savePendingRecord(storage,record){if(!valid(record))return;const records=readPendingRecords(storage),key=pendingBoardKey(record.mode,record.diff);if(betterRecord(record,records[key])){records[key]={...record};storage.setItem(PENDING_RECORD_KEY,JSON.stringify(records));}}
export function acknowledgePendingRecord(storage,submitted){const records=readPendingRecords(storage),key=pendingBoardKey(submitted.mode,submitted.diff),current=records[key];if(current&&!betterRecord(current,submitted)){delete records[key];storage.setItem(PENDING_RECORD_KEY,JSON.stringify(records));}return records;}
