// Reuse the existing clean wordmark and trace the T-shirt Bank's simple swoosh.
const fs=require('node:fs');
const sharp=require('sharp');
const image=fs.readFileSync('public/models/textures/sound-shirt-wordmark.webp').toString('base64');
fs.writeFileSync('public/models/textures/shirts/swoosh.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512" viewBox="0 0 1024 512">
<svg x="30" y="20" width="964" height="354" viewBox="0 0 240 88" overflow="hidden"><image width="240" height="140" href="data:image/webp;base64,${image}"/></svg>
<path d="M38 468 C290 330 744 292 988 372 C745 330 300 375 38 468Z" fill="#008cdb"/>
<path d="M48 460 C310 337 755 306 984 370 C738 328 314 379 48 460Z" fill="#00caff"/>
<path d="M66 449 C323 340 756 317 976 369 C740 333 329 378 66 449Z" fill="white"/>
</svg>`);
// Raster export composites the existing wordmark explicitly: SVG image href
// support differs between image decoders.
(async()=>{
 const svg=fs.readFileSync('public/models/textures/shirts/swoosh.svg','utf8').replace(/<svg x="30"[\s\S]*?<\/svg>/,'');
 const wordmark=await sharp('public/models/textures/sound-shirt-wordmark.webp').extract({left:0,top:0,width:240,height:88}).resize(964,354).png().toBuffer();
 await sharp(Buffer.from(svg)).composite([{input:wordmark,left:30,top:20}]).png().toFile('public/models/textures/shirts/swoosh.png');
})();
