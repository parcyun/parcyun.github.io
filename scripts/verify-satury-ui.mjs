// Run with ego-browser nodejs by importing this helper into the task's existing Page.
export async function verifySatury(page,base){
 await page.goto(base+'/satury/');
 await page.waitForFunction(()=>document.documentElement.dataset.gameIntro==='complete');
 if(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight+1))throw Error('Initial Satury screen exceeds the browser viewport');
 await page.fill('input[type=search]','갈퀴');
 await page.click('form button');
 await page.waitForFunction(()=>document.querySelector('form').getAttribute('aria-busy')==='false',undefined,{timeout:60000});
 const result=await page.evaluate(()=>{
  const regions=[...document.querySelectorAll('article')].map(article=>{
   const style=getComputedStyle(article),rows=[...article.querySelectorAll('p')];
   const title=article.querySelector('h2');
   const content=rows.slice(1).reduce((height,p)=>height+p.getBoundingClientRect().height,0);
   const expected=Math.max(rows[0]?.getBoundingClientRect().height||0,title.getBoundingClientRect().height)+content+Math.max(0,rows.length-1)*parseFloat(style.rowGap)+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)+4;
   return {name:title.textContent,height:article.getBoundingClientRect().height,expected,labelOverflow:title.scrollWidth>title.clientWidth+1};
  });
  return {regions,chips:document.querySelectorAll('.satury-examples [data-word]').length,source:document.querySelector('section>a')?.href,overflow:document.documentElement.scrollWidth>innerWidth};
 });
 if(result.regions.length<2)throw Error('Only one region rendered');
 if(result.regions.some(row=>row.height>row.expected+8||row.labelOverflow))throw Error('Region grid reserves empty rows or clips its label');
 if(result.chips!==3||result.overflow||!result.source?.startsWith('https://'))throw Error('Satury layout or recommendation regression');
 console.log(JSON.stringify(result));
 return result;
}
