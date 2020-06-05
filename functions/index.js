'use strict';

const admin = require("firebase-admin");
const functions = require('firebase-functions');
const path = require('path');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid'); 

const os = require('os');

const Busboy = require('busboy');
const cors = require('cors')({  origin: true, });

const serviceAccount = require('./key/googlekey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://proyecto1-61b87.firebaseio.com",
  storageBucket: "proyecto1-61b87.appspot.com",
});
const firedb = admin.database();
const bucket = admin.storage().bucket();

exports.helloWorld = functions.https.onRequest(async (req, res) => {
  return cors(req, res, () => {
    res.status(200).send("Hello world  ");
  });
});

exports.uploadFile = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  let filecounter = 0;
  if(req.params.hasOwnProperty('0')){
    if(req.params['0'].length == 2){
      filecounter = req.params['0'];
      filecounter = filecounter.slice(1,2);
      filecounter = Number(filecounter);
    }
  }

  let busboy;
  const bparams = { headers: req.headers, limits: { fileSize: 1000000 ,files: 5  }};

  const clientuuid = uuidv4();
  const clientkey = (clientuuid.slice(0,8)).toUpperCase();
  const daynumber = moment().format('DDDD');

  let arraypages;
  let arraycopys;
  

  busboy = new Busboy(bparams);
  await new Promise((resolve, reject)=>{
    busboy.on('field', (field,val) => {
      if(field == "fieldpage[]"){
        arraypages = val.split(',');
      }
      if(field == "fieldqty[]"){
        arraycopys = val.split(',');
      }
      if( (arraypages)&&(arraycopys) )
        resolve("a ok");
    });
    busboy.end(req.rawBody);
  });

  let arraypromise = [];
  let filesgroup = [];
  let counter = 0;
  busboy = new Busboy(bparams);
  busboy.on('file', (field, file, name, encode, type) => {

    const dest = `${ daynumber }/${ clientuuid }/f${ counter++ }${ path.extname(name) }`;
    const blob = bucket.file(dest);
    const blobStream = blob.createWriteStream({resumable: false, public: true, metadata: {contentType: type}});
    file.pipe(blobStream);

    const promise = new Promise((resolve, reject) => {
      file.on('end', () => {
        blobStream.end();
        if(type == "application/pdf"){
          let i = blob.name.slice(42,43);
          filesgroup.push({
            filenum: i,
            newname: 'f' + i +  path.extname(name),
            oldname: name, 
            publicUrl: `https://storage.googleapis.com/${bucket.name}/${blob.name}`,
            pages: arraypages[i],
            copys: arraycopys[i],
            date: moment().format('LLLL')
          });
        }
      });
      blobStream.on('finish', resolve);
      blobStream.on('error', reject);
    });
    arraypromise.push(promise);

  });

  busboy.on('finish', async () => {
    try {
      await Promise.all(arraypromise);
      const clientinfo = { clientuuid, clientkey, filesgroup };
      await firedb.ref(clientkey).set(clientinfo);
      cors(req, res, () => {  res.status(200).json({status: true, clientkey});  });
    } catch (error) {
      console.log(error);
      cors(req, res, () => {  res.status(200).json({status: false});  });
    }
    
  });
  busboy.end(req.rawBody);
});



/*
exports.uploadFile = functions.https.onRequest(async(req, res) => {

  //console.log(req);
  let filecounter = 0;
  if(req.params.hasOwnProperty('0')){
    if(req.params['0'].length == 2){
      filecounter = req.params['0'];
      filecounter = filecounter.slice(1,2);
      filecounter = Number(filecounter);
    }
  }

  if( ( 5>=filecounter )&&( filecounter>0 ) ){
    let busboy;
    const bparams = { headers: req.headers, limits: { fileSize: 9990, files: 5  }};
    const tmpdir = path.join(__dirname, '../public/upload');
    
    const clientuuid = uuidv4();
    const clientkey = (clientuuid.slice(0,8)).toUpperCase();
    const daynumber = moment().format('DDDD');
    const filesgroup = [];

    let arraypages;
    let arraycopys;
    busboy = new Busboy(bparams);
    await new Promise((resolve, reject)=>{
      busboy.on('field', (field,val) => {
        //console.log(`Processed field ${field}: ${val}.`);
        if(field == "fieldpage[]"){
          arraypages = val.split(',');
        }
        if(field == "fieldqty[]"){
          arraycopys = val.split(',');
        }
        if( (arraypages)&&(arraycopys) )
          resolve("a ok");
      });
      busboy.end(req.rawBody);
    });

    //let arraydata = [];
    busboy = new Busboy(bparams);
    //await new Promise( (resolve, reject)=>{
      busboy.on('file', async (field, file, name, encode, type) => {
        const filepath = path.join(tmpdir, name);
        const writeStream = fse.createWriteStream(filepath);
        file.pipe(writeStream);

        new Promise((resolve, reject) => {
          file.on('end', () => {
            writeStream.end();
          });
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });

      });
      busboy.end(req.rawBody);
    //});
    //console.log(arraydata);

    
    let fileup = 0;
    let errup = 0;
    let counter = 0;
    busboy = new Busboy(bparams);
    const res3 = await new Promise((resolve, reject)=>{
  
      busboy.on('file', async (field, file, name, encode, type) => {
       // if(type == "application/pdf"){
          try {
            const destination = `${ daynumber }/${ clientuuid }/f${ counter }${ path.extname(name) }`;
            const blob = bucket.file(destination);
            const writeoptions = { public: true, metadata: { contentType: type }, resumable: false };
            await pipeone(file,blob.createWriteStream(writeoptions));

            filesgroup.push({
              filenum: counter,
              newname: 'f' + counter +  path.extname(name),
              oldname: name, 
              publicUrl: `https://storage.googleapis.com/${bucket.name}/${blob.name}`,
              pages: arraypages[counter],
              copys: arraycopys[counter],
              date: moment().format('LLLL')
            });

            fileup++;
          } catch (err) {
            errup++;
          }
        //}else{
        //  errup++;
        //}
        counter++;

        if( (fileup+errup) >= filecounter ){
          if(errup){
            resolve({status: false, message: "an error"});
          }else{

            const clientinfo = {
              uuid: clientuuid,
              key: clientkey,
              files: filesgroup
            }
            console.log(clientinfo);

            resolve({status: true, message: "aa okkkk"});
          }
        }
        



      });
      busboy.end(req.rawBody);
  
    });
    
    
    if( true ||res3['status']){
      cors(req, res, () => {  res.status(200).send("okkkk");  });
    }else{
      cors(req, res, () => {  res.status(403).send('Forbidden!'); });
    }

  }else{
      cors(req, res, () => {  res.status(403).send('Forbidden!'); });
  }

});
*/

/*
exports.uploadFile = functions.https.onRequest((req, res) => {
  console.log("enter in fcn");
  const busboy = new Busboy({headers: req.headers});

  busboy.on('file', async (field, file, name, encode, type) => {

    const mypipeline = util.promisify(stream.pipeline);

    console.log(type);
    const options = {
      resumable: true,
      public: true,
      validation: 'crc32c'
    };

    const blob = bucket.file("160/"+name);

    const undato = await mypipeline(file,blob.createWriteStream(options));
    console.log("end"+ name);
    
    file.pipe(blob.createWriteStream(options))
      .on('error', function(err) {console.log("err"+ err)})
      .on('finish', function() {
        console.log(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
        //console.log("a ok")
      });

  });

  busboy.end(req.rawBody, function () {
    console.log("algo");
  } );

  busboy.on('finish', function() {
    console.log('Done parsing form!');
  });

  return cors(req, res, () => {
    res.status(200).send("perro");
  });

});
*/

/*
exports.uploadFile = functions.https.onRequest((req, res) => {
  console.log("enter in fcn");
  const busboy = new Busboy({headers: req.headers});
  const tmpdir = path.join(__dirname, '../public/upload');
  //const tmpdir = os.tmpdir();
  //console.log(busboy);
  const fields = {};
  const uploads = {};

  busboy.on('field', (fieldname, val) => {
    console.log(`Processed field ${fieldname}: ${val}.`);
  });

  busboy.on('file', (fieldname, file, filename) => {
    console.log(filename);
    //const blob = bucket.file(filename);
    //console.log(blob);
    const filepath = path.join(tmpdir, filename);
    uploads[fieldname] = filepath;
    
    const writeStream = fs.createWriteStream(filepath);
    file.pipe(writeStream);

    const promise = 
    fileWrites.push(promise);
    
  });
  busboy.end(req.rawBody);

  return cors(req, res, () => {
    res.status(200).send("perro");
  });

});

exports.perros2 = functions.https.onCall((data,context)=>{
  console.log(data);
  return  "a ok"; 
});
*/

  /*
const multer = require('multer');
const path = require('path');
const moment = require('moment');
const methodOverride = require('method-override'); 
  const cors = require('cors')({
    origin: true,
});
  exports.perros2 = functions.https.onCall((data,context)=>{
  console.log(data);
    let otrogato = false;
    if(data.hasOwnProperty('info')){
        console.log(data['info']);
        otrogato = data['info'];
    };
    return {
        message: `Un dato random: `+ (Math.round(Math.random()*100)) + ` y ten tu dato maldita criada: `,
        otrogato
    };
});

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../public/upload'),
  filename(req, file, cb) {
    //const d = moment().format('x');
    //cb(null, d.toString() + path.extname(file.originalname));
    cb(null, file.originalname);
  }
});

var upload = multer({ storage: storage }).single('file1');

exports.date = functions.https.onRequest((req, res) => {
  console.log("first");
  //console.log(req);
  console.log();

  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      console.log("1err" + err);
    } else if (err) {
      // An unknown error occurred when uploading.
      console.log("2err" + err);
    }else{
      console.log("a ok");
    }
    console.log("multer");
    console.log(req);
    
    // Everything went fine.
  });

    //multer('file1');

    console.log(req.body);
    console.log();
    console.log(req.file);
    console.log();
    console.log(req.files);
    if (req.method === 'PUT') {
      return res.status(403).send('Forbidden!');
    }
    return cors(req, res, () => {
      let format = req.query.format;
      if (!format) {
        format = req.body.format;
      }
      // [START sendResponse]
      const formattedDate = moment().format(format);
      //console.log('Sending Formatted date:', formattedDate);
      res.status(200).send(formattedDate);
      // [END sendResponse]
    });
  });
*/



/*
const functions = require('firebase-functions');
const express = require('express');
const path = require('path'); 
const multer = require('multer');
const app = express();
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../public/upload'),
  filename(req, file, cb) {
    //const d = moment().format('x');
    //cb(null, d.toString() + path.extname(file.originalname));
    cb(null, file.originalname);
  }
});
app.use(multer({storage}).single('afield')); 
app.get("/",function(req,res){
  res.send("perro");
});
app.post("/",function(req,res){
  console.log(req.files)
  res.send("perro");
});
exports.untest = functions.https.onRequest(app);

exports.helloWorld = functions.https.onRequest((req, res) => {
 res.send("Hello from Firebase!");
});
*/