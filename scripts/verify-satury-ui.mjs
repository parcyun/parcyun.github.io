// Run with ego-browser nodejs by importing this helper into the task's existing Page.
export async function verifySatury(page,base){
 await page.goto(base+'/satury/');
 await page.waitForFunction(()=>document.documentElement.dataset.gameIntro==='complete');
 await page.fill('input[type=search]','갈퀴');
 await page.click('form button');
 await page.waitForFunction(()=>document.querySelector('form').getAttribute('aria-busy')==='false',undefined,{timeout:60000});
 const result=await page.evaluate(()=>{
  const regions=[...document.querySelectorAll('article')].map(article=>{
   const style=getComputedStyle(article),rows=[...article.querySelectorAll('p')];
   const content=rows.reduce((height,p)=>height+p.getBoundingClientRect().height,0);
   const expected=Math.max(content+Math.max(0,rows.length-1)*parseFloat(style.rowGap),article.querySelector('h2').getBoundingClientRect().height)+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)+4;
   return {name:article.querySelector('h2').textContent,height:article.getBoundingClientRect().height,expected};
  });
  return {regions,chips:document.querySelectorAll('#word-recommendations button').length,source:document.querySelector('section>a')?.href,overflow:document.documentElement.scrollWidth>innerWidth};
 });
 if(result.regions.length<2)throw Error('Only one region rendered');
 if(result.regions.some(row=>row.height>row.expected+8))throw Error('Region grid reserves empty rows');
 if(result.chips!==4||result.overflow||!result.source?.startsWith('https://'))throw Error('Satury layout or recommendation regression');
 console.log(JSON.stringify(result));
 return result;
}
