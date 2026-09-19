/** Original synthetic optical target for exercising the software. Not a Pokémon card. */
export function demoPhoto(side){
 const c=document.createElement('canvas');c.width=1250;c.height=1550;let g=c.getContext('2d');
 g.fillStyle='#202934';g.fillRect(0,0,c.width,c.height);
 const x=215,y=198,w=819,h=1144,l=side==='front'?39:42,r=side==='front'?35:42,t=42,b=40;
 g.fillStyle=side==='front'?'#dac176':'#55779f';g.fillRect(x,y,w,h);
 g.fillStyle='#142e37';g.fillRect(x+l,y+t,w-l-r,h-t-b);
 g.strokeStyle='#829994';g.lineWidth=2;g.strokeRect(x+l+25,y+t+30,w-l-r-50,h-t-b-60);
 g.fillStyle='#d5e1d9';g.font='22px monospace';g.fillText('CARDTRUTH  /  OPTICAL TARGET',x+75,y+115);
 g.font='bold 63px sans-serif';g.fillText(side==='front'?'SURFACE':'REVERSE',x+75,y+205);
 g.font='21px sans-serif';g.fillStyle='#a4baba';g.fillText('Synthetic sample. Not a collectible.',x+75,y+250);
 const cx=x+w/2,cy=y+h/2+20;
 for(let k=0;k<6;k++){g.beginPath();g.arc(cx,cy,60+k*34,0,Math.PI*2);g.strokeStyle=k%2?'#84a49b':'#526e72';g.lineWidth=k%2?3:1;g.stroke();}
 g.strokeStyle='#d5c57c';g.lineWidth=2;g.beginPath();g.moveTo(cx-225,cy);g.lineTo(cx+225,cy);g.moveTo(cx,cy-225);g.lineTo(cx,cy+225);g.stroke();
 g.font='18px monospace';g.fillStyle='#c5d4d0';g.fillText('LENS / LIGHT / ALIGNMENT',x+75,y+h-240);
 for(let k=0;k<24;k++){g.fillStyle=k%2?'#bdd1c7':'#1c4147';g.fillRect(x+75+k*24,y+h-195,12,55);}
 g.font='18px sans-serif';g.fillStyle='#a1b4b0';g.fillText('For software testing only. No grading ground truth.',x+75,y+h-90);
 if(side==='front'){g.fillStyle='#faf7e8';g.fillRect(x+w-8,y+340,6,10);g.fillRect(x+8,y+h-230,5,9);}
 return {canvas:c,quad:[[x,y],[x+w-1,y],[x+w-1,y+h-1],[x,y+h-1]]};
}
