import QRCode from 'qrcode';
export function inviteQr(link,mascot){
 const qr=QRCode.create(link,{errorCorrectionLevel:'H'}),size=qr.modules.size,margin=4,cutout=9,start=Math.floor((size-cutout)/2),dimension=size+margin*2,paths=[];
 for(let row=0;row<size;row++)for(let column=0;column<size;column++)if(!(row>=start&&row<start+cutout&&column>=start&&column<start+cutout)&&qr.modules.get(row,column))paths.push(`M${column+margin} ${row+margin}h1v1h-1z`);
 const center=margin+start,svg=`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 ${dimension} ${dimension}"><rect width="${dimension}" height="${dimension}" fill="#fff"/><path fill="#101319" d="${paths.join('')}"/><image x="${center+.35}" y="${center+.35}" width="${cutout-.7}" height="${cutout-.7}" href="data:image/png;base64,${mascot}"/></svg>`;
 return 'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');
}
