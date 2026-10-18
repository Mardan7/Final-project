const express = require('express');
const session = require('express-session');
const app = express();
app.set('json spaces',2);
app.use(express.json({limit:'16kb'}));
app.use('/customer',session({
  secret:process.env.SESSION_SECRET || require('node:crypto').randomBytes(32).toString('hex'),
  resave:false,saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:'lax',maxAge:3600000}
}));
app.use('/customer',require('./router/auth_users').authenticated);
app.use('/',require('./router/general').general);
app.use((req,res) => res.status(404).json({message:'Route not found'}));
app.use((error,req,res,next) => res.status(error.status || 500).json({message:error.status === 400 ? 'Invalid JSON request' : 'Request failed'}));
if (require.main === module) app.listen(process.env.PORT || 5000,'127.0.0.1',() => console.log('Bookstore server listening'));
module.exports = app;
