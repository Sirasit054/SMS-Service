var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
var xlstojson = require("xls-to-json-lc");
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var url = 'mongodb://localhost:27017/SMS-Service';

app.use(bodyParser.json());

var storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
        var datetimestamp = Date.now();
        //cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
        cb(null, datetimestamp + '-' + file.originalname);
    }
});

var upload = multer({ //multer settings
    storage: storage,
    fileFilter: function (req, file, callback) { //file filter
        if (['xls'].indexOf(file.originalname.split('.')[file.originalname.split('.').length - 1]) === -1) {
            return callback(new Error('Wrong extension type'));
        }
        callback(null, true);
    }
}).single('file');

app.post('/sendsms', (req, res) => {
    MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
        db.collection('sendMessageLog').insertOne({
            // no: list.no,
            fname: req.body.fname,
            lname: req.body.lname,
            tel: req.body.telno,
            message: req.body.msg_data,
        }, function (err, result) {
            assert.equal(null, err);
            console.log('Item inserted');
            db.close();
        });
    });
    var errors = false;
    if (errors) {
        req.session.errors = errors;
        req.session.success = false;
    } else {
        req.session.success = true;
    }
    console.log("Send one recipients complete !!!");
    res.redirect('/home');
    // });
    //------------------------------------------------------------------comment to test function (don't send a message)---------------------------
});

/** API path that will upload the files */
app.post('/upload', function (req, res) {
    var exceltojson;
    upload(req, res, function (err) {
        if (err) {
            res.json({ error_code: 1, err_desc: err });
            return;
        }
        /** Multer gives us file info in req.file object */
        if (!req.file) {
            res.json({ error_code: 1, err_desc: "No file passed" });
            return;
        }
        /** Check the extension of the incoming file and 
         *  use the appropriate module
         */
        if (req.file.originalname.split('.')[req.file.originalname.split('.').length - 1] === 'xls') {
            exceltojson = xlstojson;
        }
        console.log(req.file.path);
        try {
            exceltojson({
                input: req.file.path,
                output: null, //since we don't need output.json
                lowerCaseHeaders: true
            }, function (err, result) {
                if (err) {
                    return res.json({ error_code: 1, err_desc: err, data: null });
                }
                for (var i = 0; i < result.length; i++) {
                    var list = result[i];
                }
                result.forEach(function (doc) {
                    MongoClient.connect(url, function (err, db) {
                        assert.equal(null, err);
                        db.collection('sendMessageLog').insert({
                            no: doc.no,
                            name: doc.name,
                            phone: doc.phone,
                            message: doc.message,
                        }, function (err, result) {
                            assert.equal(null, err);
                            console.log('Item inserted ' + doc.fname);
                            db.close();
                        });
                    });
                });

                //------------------------------------------------------------------comment to test function (don't send a message)---------------------------

                var errors = false;
                if (errors) {
                    req.session.errors = errors;
                    req.session.success = false;
                } else {
                    req.session.success = true;
                }
                console.log("Send multiple recipients complete !!!");
                res.redirect('/home');

            });
        } catch (e) {
            res.json({ error_code: 1, err_desc: "Corupted excel file" });
        }
    })

});



app.get('/', function (req, res) {
    res.sendFile(__dirname + "/index.html");
});

app.listen('3002', function () {
    console.log('running on 3002...');
});