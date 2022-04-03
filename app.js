var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
const { v4: uuidv4 } = require('uuid');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/FullAssignment";
let dbcon;
var ObjectId = require("mongodb").ObjectId;
const MongoStore = require('connect-mongo');
const ObjectIdGen = function () {
    return ObjectId();
}

var app = express();

app.use(logger('tiny'));
app.use(express.json()); 
app.use(express.urlencoded({ extended: false }));  //to use the req.body variable when the html form is submitted
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/edit', express.static(path.join(__dirname, 'public')));
app.use('/displayData/employees', express.static(path.join(__dirname, 'public')));
app.use('/displayData/trashbin', express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs')
app.set('trust proxy', 1) // trust first proxy
app.use(session({
    genid: function (req) {
        return uuidv4() // use UUIDs for session IDs
    },
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30000000 },
    store: MongoStore.create({
        mongoUrl: url,
    }
    )
}))
MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    dbcon = db.db("FullAssignment");

});

app.get("/register", (req, res) => {
    res.render('register',{errDesc:""});
})
app.post('/task/:id/:id1/:id2?', (req, res) => {
    var mode = req.params.id;
    var empid = req.params.id1;
    var taskid = req.params.id2;
    if (mode == "create") {
        var taskObj = {
            "achieverID": ObjectId(empid),
            "achieverName": req.body.achieverName,
            "taskTitle": req.body.taskTitle,
            "taskDesc": req.body.taskDesc,
            "taskStatus": false

        }
        dbcon.collection('tasksDB').insertOne(taskObj, (err, res1) => {
            if (err) throw err;
            res.redirect("/displayData/employees/" + empid)
        })
    }
    else if (mode == "alive") {
        dbcon.collection('tasksDB').updateOne({ _id: ObjectId(taskid) }, { $set: { taskStatus: true } }, (err, res1) => {
            if (err) throw err;
            res.redirect("/displayData/employees/" + empid);
        })
    }
})
app.get('/restore/:id', (req, res) => {

    // Running Queries using promises(enhances the asynchronous execution)

    const trashPromiseFind = new Promise((resolve, reject) => {
        dbcon.collection('trashbin').findOne({ "_id": ObjectId(req.params.id) }, (err, res1) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(res1);
            }
        })
    });
    trashPromiseFind.then((result) => {
        const empPromiseInsert = new Promise((resolve, reject) => {
            dbcon.collection('employees').insertOne(result, (err, res1) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res1);
                }
            })
        });
        const trashPromiseDelete = new Promise((resolve, reject) => {
            dbcon.collection('trashbin').deleteOne({ _id: ObjectId(req.params.id) }, (err, res1) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res1);
                }
            })
        });
        Promise.all([empPromiseInsert, trashPromiseDelete]).then((result) => {
            res.redirect('/trash');
        })
    });

    // Nested Queries without promises

    // dbcon.collection('trashbin').findOne({ "_id": ObjectId(req.params.id) }, (err, res1) => {
    //     if (err) throw err;
    //     dbcon.collection('employees').insertOne(res1, (err, res2) => {
    //         if (err) throw err;
    //         dbcon.collection('trashbin').deleteOne({ "_id": ObjectId(req.params.id) }, (err, res3) => {
    //             if (err) throw err;
    //             res.redirect('/trash')
    //         })
    //     })
    // })
})
app.get('/trash', (req, res) => {

    //async await concept

    
    fetchData();
    async function fetchData(){
        var trashbinData=await dbcon.collection('trashbin').find({}).toArray();
        res.render('index',{tableArray: trashbinData,name: req.session.name, mode: "trashbin"})
    }

    //with out async await concept 

    // dbcon.collection('trashbin').find({}).toArray((err, res1) => {
    //     if (err) throw err;
    //     res.render('index', { tableArray: res1, name: req.session.name, mode: "trashbin" });
    // })
})
app.get('/displayData/:id/:id1', (req, res) => {
    if (req.params.id == "trashbin") {
        dbcon.collection('trashbin').findOne({ "_id": ObjectId(req.params.id1) }, (err, res1) => {
            if (err) throw err;
            res.render('disableForm', { "editObject": res1, name: req.session.name, "tasks": {} })
        })
    }
    else {

        // Running Queries using promises(enhances the asynchronous execution)

        const empPromiseFind = new Promise((resolve, reject) => {
            dbcon.collection('employees').findOne({ _id: ObjectId(req.params.id1) }, (err, res1) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res1);
                }
            })
        })
        const taskPromiseFind = new Promise((resolve, reject) => {
            dbcon.collection('tasksDB').find({ achieverID: ObjectId(req.params.id1) }).toArray((err, res1) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res1);
                }
            })
        });
        Promise.all([empPromiseFind, taskPromiseFind]).then((result) => {
            res.render('disableForm', { "editObject": result[0], name: req.session.name, "tasks": result[1] });
        })


        // Nested Queries without promises

        // dbcon.collection('employees').findOne({ "_id": ObjectId(req.params.id1) }, (err, res1) => {
        //     if (err) throw err;
        //     dbcon.collection('tasksDB').find({ achieverID: ObjectId(req.params.id1) }).toArray((err, res2) => {
        //         res.render('disableForm', { "editObject": res1, name: req.session.name, "tasks":res2})
        //     })
        // })
    }
})
app.get('/edit/:id', (req, res) => {
    const empPromiseFind = new Promise((resolve, reject) => {
        dbcon.collection('employees').findOne({ _id: ObjectId(req.params.id) }, (err, res1) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(res1);
            }
        })
    })
    const deptPromiseFind = new Promise((resolve, reject) => {
        dbcon.collection('departments').find({}).toArray((err, res1) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(res1);
            }
        })
    })
    Promise.all([empPromiseFind, deptPromiseFind]).then((result) => {
        res.render('form', { name: req.session.name, "editObject": result[0], depts: result[1], mode: "editable" })
    })



    // Nested Queries without promises

    //     dbcon.collection('employees').findOne({ "_id": ObjectId(req.params.id) }, (err, res1) => {
    //         if (err) throw err;
    //         dbcon.collection('departments').find({}).toArray((err, res2) => {
    //             if (err) throw err;
    //             res.render('form', { name: req.session.name, "editObject": res1, depts: res2, mode: "editable" })
    //         })
    //     })


})
app.get('/delete/:id/:id1', (req, res) => {
    if (req.params.id == "trashbin") {
        dbcon.collection('trashbin').deleteOne({ "_id": ObjectId(req.params.id1) }, (err, res1) => {
            if (err) throw err;
            res.redirect('/trash')
        })
    }
    else {

        // Running Queries using promises(enhances the asynchronous execution)

        const empPromiseFind = new Promise((resolve, reject) => {
            dbcon.collection('employees').findOne({ _id: ObjectId(req.params.id1) }, (err, res1) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res1);
                }
            })
        });
        empPromiseFind.then((result) => {
            const trashPromiseInsert = new Promise((resolve, reject) => {
                dbcon.collection('trashbin').insertOne(result, (err, res1) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(res1);
                    }
                })
            });
            const empPromiseDelete = new Promise((resolve, reject) => {
                dbcon.collection('employees').deleteOne({ _id: ObjectId(req.params.id1) }, (err, res1) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(res1);
                    }
                })
            });
            Promise.all([trashPromiseInsert, empPromiseDelete]).then((result) => {
                res.redirect('/data');
            })
        });

        // Nested Queryies without promises

        // dbcon.collection('employees').findOne({ "_id": ObjectId(req.params.id1) }, (err, res1) => {
        //     if (err) throw err;
        //     dbcon.collection('trashbin').insertOne(res1, (err, res2) => {
        //         if (err) throw err;
        //         dbcon.collection('employees').deleteOne({ "_id": ObjectId(req.params.id1) }, (err, res3) => {
        //             if (err) throw err;
        //             res.redirect('/data')
        //         })
        //     })
        // })
    }


});

app.get('/data', (req, res) => {
    if (req.session.auth == true) {
        dbcon.collection('employees').find({}).toArray((err, res1) => {
            if (err) throw err;
            res.render('index', { tableArray: res1, name: req.session.name, mode: "employees" });
        })
    }
    else {
        res.render('unauthorized')
    }

})
app.get('/', (req, res) => {
    res.render('login',{errDesc:""});
})
app.get('/form', (req, res) => {
    if (req.session.auth == true) {
        dbcon.collection('departments').find({}).toArray((err, res1) => {
            if (err) throw err;
            res.render('form', { name: req.session.name, "editObject": {}, depts: res1, mode: "newForm" })
        })

    }
    else {
        res.render('unauthorized')
    }
})
app.post('/', (req, res) => {
    dbcon.collection("users").findOne({email:req.body.email},(err,res1)=>{
        if(err) throw err;
        if(!res1){
            res.render('login',{errDesc:"Inavlid User!"})
        }
        else{
            if (req.body.password!=res1.password){
                res.render('login',{errDesc:"Inavlid Password!"})
            }
            else{
                req.session.auth = true;
                req.session.name=res1.name;
                res.redirect("/data")
            }
        }
    })
})
app.post('/save', (req, res) => {
    if (req.session.auth) {
        var empObject = {
            "id": req.body.id,
            "ename": req.body.ename,
            "des": req.body.des,
            "loc": req.body.loc,
            "jd": req.body.jd,
            "dept": req.body.dept
        }
        if (req.body.monid) {
            dbcon.collection("employees").updateOne({ "_id": ObjectId(req.body.monid) }, { $set: empObject }, function (err, res1) {
                if (err) throw err;
                console.log("1 document Updated");
                res.redirect("/data")
            });
        }
        else {
            const newId = ObjectIdGen();
            empObject._id = newId;
            dbcon.collection("employees").insertOne(empObject, function (err, res1) {
                if (err) throw err;
                console.log("1 document inserted");
                res.redirect("/data")
            });
        }
    }
    else {
        res.render('unauthorized')
    }
})
app.post("/registerSave", (req, res) => {

    dbcon.collection('users').findOne({ email: req.body.email }, (err, res1) => {
        if (err) {
            console.log("No")
        }
        else {
            if (res1) {
                res.render('register', { errDesc: "Username Already Exists" })
            }
            else {
                if (req.body.password != req.body.cPassword) {
                    res.render('register', { errDesc: "Password mismatch" })
                }
                else {
                    var newUser = {
                        "name": req.body.ename,
                        "email": req.body.email,
                        "password": req.body.password,
                        }
                    dbcon.collection('users').insertOne(newUser,(err,res1)=>{
                        req.session.auth = true;
                        req.session.name = req.body.ename;
                        res.redirect('/data')
                    })
                }

            }
        }
    })

})
app.post('/unauthorized', (req, res) => {
    res.redirect('/')
})
app.get('/logout', (req, res) => {
    req.session.destroy(function () {
        res.redirect('/')
    })
})
module.exports = app;
