function zip(parts) {
  const local=[],central=[]; let offset=0;
  for(const [name,value] of Object.entries(parts)) {
    const data=Buffer.from(value), filename=Buffer.from(name); let crc=0xffffffff;
    for(const byte of data) { crc^=byte; for(let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); }
    crc=(crc^0xffffffff)>>>0;
    const l=Buffer.alloc(30);l.writeUInt32LE(0x04034b50);l.writeUInt16LE(20,4);l.writeUInt32LE(crc,14);l.writeUInt32LE(data.length,18);l.writeUInt32LE(data.length,22);l.writeUInt16LE(filename.length,26);
    local.push(l,filename,data);
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(filename.length,28);c.writeUInt32LE(offset,42);central.push(c,filename);offset+=l.length+filename.length+data.length;
  }
  const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(central.length/2,8);end.writeUInt16LE(central.length/2,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,directory,end]);
}
const wordRow=cells=>`<w:tr>${cells.map(value=>`<w:tc><w:p><w:r><w:t>${value}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
function wordFixture(){return {'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${wordRow(['CMSJourney','1.0','journey'])}</w:tbl><w:tbl>${wordRow(['Pages'])}${wordRow(['recordId','operation','expectedRevision','title'])}${wordRow(['journey-01','update','r2','A private journey through the forests'])}</w:tbl></w:body></w:document>`};}

export {zip,wordFixture};
