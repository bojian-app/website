// A store-only ZIP keeps directory upload dependency-free and deterministic.
// Server validation is authoritative; this check gives immediate feedback.
export async function packTemplateDirectory(input: FileList): Promise<File> {
  const files = Array.from(input).filter(f => !f.webkitRelativePath.split('/').some(p => p.startsWith('.') || p === '__MACOSX'));
  if (!files.length || files.length > 128) throw new Error('模板目录须包含 1 至 128 个文件。');
  const prefix = files[0].webkitRelativePath.split('/')[0] + '/';
  const names = files.map(f => f.webkitRelativePath.slice(prefix.length));
  if (files.some(f => !f.webkitRelativePath.startsWith(prefix)) || names.some(n => !n || n.split('/').some(p => p === '..' || p === '.')))
    throw new Error('请选择单个完整模板目录。');
  for (const name of ['manifest.json','index.html'])
    if (!names.includes(name)) throw new Error(`模板目录缺少 ${name}。`);
  if (files.reduce((n,f) => n+f.size,0) > 8*1024*1024-32768)
    throw new Error('目录包须小于 8 MB，请压缩背景素材后重试。');
  const parts: Uint8Array<ArrayBuffer>[] = [], central: Uint8Array<ArrayBuffer>[] = [];
  const encoder = new TextEncoder();
  let position = 0;
  function crc32(bytes: Uint8Array) {
    let crc = 0xffffffff;
    for(const b of bytes) { crc ^= b; for(let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); }
    return (crc^0xffffffff)>>>0;
  }
  for(let i=0;i<files.length;i++) {
    const data=new Uint8Array(await files[i].arrayBuffer()), name=encoder.encode(names[i]), crc=crc32(data);
    const local=new Uint8Array(30+name.length), l=new DataView(local.buffer);
    l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);
    l.setUint16(12,33,true);l.setUint32(14,crc,true);l.setUint32(18,data.length,true);l.setUint32(22,data.length,true);l.setUint16(26,name.length,true);local.set(name,30);
    const header=new Uint8Array(46+name.length), c=new DataView(header.buffer);
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,position,true);header.set(name,46);
    parts.push(local,data);central.push(header);position+=local.length+data.length;
  }
  const end=new Uint8Array(22), e=new DataView(end.buffer);
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);
  e.setUint32(12,central.reduce((n,p)=>n+p.length,0),true);e.setUint32(16,position,true);
  return new File([...parts,...central,end],prefix.slice(0,-1)+'.zip',{type:'application/zip'});
}
