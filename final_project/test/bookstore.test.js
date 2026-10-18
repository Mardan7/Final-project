const {test} = require('node:test');
const assert = require('node:assert/strict');
const app = require('../index');
const {createBookClient} = require('../router/general');
test('bookstore integration: searches, authentication, review ownership and concurrency',async () => {
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  async function request(path,method='GET',body,cookie) {
    const res = await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
    return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
  }
  try {
    const client = createBookClient(base);
    const [all,isbn,author,title] = await Promise.all([client.getAllBooks(),client.getBooksByISBN(1),client.getBooksByAuthor('Unknown'),client.getBooksByTitle('Things Fall Apart')]);
    assert.equal(Object.keys(all).length,10);
    assert.equal(isbn.title,'Things Fall Apart');
    assert.equal(Object.keys(author).length,4);
    assert.deepEqual(title['1'],isbn);
    assert.equal((await request('/isbn/missing')).status,404);
    assert.deepEqual((await request('/review/1')).body,{});
    assert.equal((await request('/customer/auth/review/1','PUT',{review:'x'})).status,401);
    assert.equal((await request('/register','POST',{})).status,400);
    const registration = await Promise.all([request('/register','POST',{username:'alice',password:'demo'}),request('/register','POST',{username:'alice',password:'demo'})]);
    assert.deepEqual(registration.map(r=>r.status).sort(),[201,409]);
    assert.equal((await request('/customer/login','POST',{username:'alice',password:'bad'})).status,401);
    const alice = await request('/customer/login','POST',{username:'alice',password:'demo'});
    assert.equal(alice.status,200);
    await request('/register','POST',{username:'bob',password:'demo'});
    const bob = await request('/customer/login','POST',{username:'bob',password:'demo'});
    await Promise.all([request('/customer/auth/review/1','PUT',{review:'Alice review'},alice.cookie),request('/customer/auth/review/1','PUT',{review:'Bob review'},bob.cookie)]);
    assert.deepEqual((await request('/review/1')).body,{alice:'Alice review',bob:'Bob review'});
    assert.equal((await request('/customer/auth/review/1','PUT',{review:''},alice.cookie)).status,400);
    await request('/customer/auth/review/1','PUT',{review:'Updated'},alice.cookie);
    assert.equal((await request('/review/1')).body.alice,'Updated');
    await request('/customer/auth/review/1','DELETE',undefined,alice.cookie);
    assert.deepEqual((await request('/review/1')).body,{bob:'Bob review'});
    assert.equal((await request('/customer/auth/review/1','DELETE',undefined,alice.cookie)).status,404);
    await request('/customer/auth/review/1','DELETE',undefined,bob.cookie);
    await assert.rejects(client.getBooksByISBN('missing'),error=>error.response.status===404);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
