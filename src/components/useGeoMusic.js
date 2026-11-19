import {useEffect,useRef,useState} from "react";
import {createMusicRotation} from "../../public/music-rotation.js";
const geoTracks = ["brain-dance", "newer-wave", "neon-laser-horizon", "cloud-dancer", "tech-live"];
const musicKey = "ps-geoweb-battle-music";
export default function useGeoMusic(active=true){
  const [musicEnabled,setMusicEnabled]=useState(()=>{try{return localStorage.getItem(musicKey)!=="off";}catch{return true;}});
  const music = useRef(null);
  const nextTrack = useRef(null);
  useEffect(() => {
    return () => { music.current?.pause(); };
  }, []);
  function playMusic() {
    if (!music.current) {
      nextTrack.current = createMusicRotation(geoTracks);
      const audio = new Audio(`/geoweb-battle/audio/${nextTrack.current()}.mp3`);
      audio.volume = 0.24;
      audio.addEventListener("ended", () => {
        audio.src = `/geoweb-battle/audio/${nextTrack.current()}.mp3`;
        audio.play().catch(() => {});
      });
      music.current = audio;
    }
    if (music.current.paused) music.current.play().catch(() => {});
  }
  function toggleMusic() {
    const enabled = !musicEnabled;
    setMusicEnabled(enabled);
    try { localStorage.setItem(musicKey, enabled ? "on" : "off"); } catch {}
    if (enabled) playMusic();
    else music.current?.pause();
  }
  useEffect(()=>{
    if (!active || !musicEnabled) return;
    playMusic();
    const start=event=>{if(!event.target.closest?.('[data-music-toggle],.gb-sound')) playMusic();};
    document.addEventListener('click',start);
    return ()=>document.removeEventListener('click',start);
  },[active,musicEnabled]);
  return {musicEnabled,playMusic,toggleMusic};
}
