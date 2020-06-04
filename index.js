const express = require('express');                     
const app = express();                                  
const path = require('path');                

app.set('port',process.env.PORT || 3000);               

app.use(express.json());                                

app.use(express.static(path.join(__dirname, './public')));     

app.listen(app.get('port'), function(){                  
  console.log(`Server on port ${app.get('port')}`);    
});