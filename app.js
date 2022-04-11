var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
const { v4: uuidv4 } = require('uuid');
var MongoClient = require('mongodb').MongoClient;
const MongoStore = require('connect-mongo');
var bcrypt = require('bcryptjs');
var ObjectId = require("mongodb").ObjectId;

var url = "mongodb://localhost:27017/FullAssignment";
let dbcon;


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
app.use('/CompareAnalytics', express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs')
app.set('trust proxy', 1) // trust first proxy
app.use(session({
    genid: function (req) {
        return uuidv4() // use UUIDs for session IDs
    },
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3000000 },
    store: MongoStore.create({
        mongoUrl: url,
    }),
}))


MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    dbcon = db.db("FullAssignment");

});

app.post("/validateIDs", (req, res) => {
    var empPromise = new Promise((resolve, reject) => {
        dbcon.collection('EmployeeDetails').findOne({ EmpID: parseInt(req.body.empID) }, (err, res1) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(res1)
            }
        })
    })
    empPromise.then((val) => {
        if(val!=null){
            res.json(
                {
                    errMsg:"",
                }
            )
        }
        if (val == null) {
            res.json(
                {
                    errMsg: "Employee_ID doesn't exists"

                }
            )
        }
        

    })
})
app.post("/1vs1Analytics", (req, res) => {

    var labels = ['EmpSatisfaction', 'SpecialProjectsCount', 'DaysLateLast30', 'Absences'];

    var emp1Promise = new Promise((resolve, reject) => {
        dbcon.collection('EmployeeDetails').findOne({ EmpID: parseInt(req.body.emp1) }, { projection: { _id: 0, EmpSatisfaction: 1, SpecialProjectsCount: 1, DaysLateLast30: 1, Absences: 1 } }, (err, res1) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(res1)
            }
        })
    })
    var emp2Promise = new Promise((resolve, reject) => {
        dbcon.collection('EmployeeDetails').findOne({ EmpID: parseInt(req.body.emp2) }, { projection: { _id: 0, EmpSatisfaction: 1, SpecialProjectsCount: 1, DaysLateLast30: 1, Absences: 1 } }, (err, res1) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(res1)
            }
        })
    })
    Promise.all([emp1Promise, emp2Promise]).then((val) => {
        res.render('compareCharts', { labels: labels, dataSet: Object.values(val[0]), name: req.session.name, avgResults: Object.values(val[1]), mode: "1vs1Compare", emp1_Id: req.body.emp1, emp2_Id: req.body.emp2 })
    })
})


app.get('/home', (req, res) => {
    console.log(req.session)
    if (req.session.auth) {
        res.render('home', { name: req.session.name });
    }
    else {
        res.render('unauthorized')
    }
})



app.get("/CompareAnalytics/:id", (req, res) => {

    var avgResults = []
    var dataSet = []
    var promises = []

    var labels = ['EmpSatisfaction', 'SpecialProjectsCount', 'DaysLateLast30', 'Absences'];
    for (var x of labels) {
        var avgPipeline = [
            {
                '$match': {}
            }, {
                '$group': {
                    '_id': null,
                    'Average': {
                        '$avg': '$' + x,
                    }
                }
            }
        ];
        promises.push(new Promise((resolve, reject) => {
            dbcon.collection("EmployeeDetails").aggregate(avgPipeline).toArray((err, res1) => {
                if (err) {
                    reject(err)
                }
                else {
                    resolve(res1[0]['Average'])
                }
            });
        }));
    }
    var ownResultPromise = new Promise((resolve, reject) => {
        dbcon.collection("EmployeeDetails").findOne({ _id: ObjectId(req.params.id) }, { projection: { _id: 0, EmpSatisfaction: 1, SpecialProjectsCount: 1, DaysLateLast30: 1, Absences: 1 } }, (err, res1) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(res1)
            }
        })
    })
    ownResultPromise.then((val) => {
        dataSet = Object.values(val);
    })
    promises.push(ownResultPromise)
    Promise.all(promises).then((res1) => {
        avgResults = res1;
        typeof (avgResults)
        res.render('compareCharts', { labels: labels, dataSet: dataSet, name: req.session.name, avgResults: avgResults, mode: "avgCompare", emp1_Id:"",emp2_Id:""})
    })
})



app.get("/analytics", (req, res) => {
    var pipeline = [
        {
            '$match': {}
        }, {
            '$group': {
                '_id': '$' + req.query.analyticsType,
                'Count': {
                    '$sum': 1
                }
            }
        }
    ];
    var labels = []
    var dataSet = []
    var resultPromise = new Promise((resolve, reject) => {
        dbcon.collection("EmployeeDetails").aggregate(pipeline).toArray((err, res1) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(res1)
            }
        });
    })
    resultPromise.then((result) => {
        result.forEach((res1) => {
            labels.push(res1['_id'])
            dataSet.push(res1['Count'])
        })
        console.log(labels)
        console.log(dataSet)
        res.render('charts', { labels: labels, dataSet: dataSet, name: req.session.name })
    })
})



app.get("/register", (req, res) => {
    res.render('register', { errDesc: "" });
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
            dbcon.collection('EmployeeDetails').insertOne(result, (err, res1) => {
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
    async function fetchData() {
        var trashbinData = await dbcon.collection('trashbin').find({}).toArray();
        res.render('index', { tableArray: trashbinData, name: req.session.name, mode: "trashbin" })
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
            dbcon.collection('EmployeeDetails').findOne({ _id: ObjectId(req.params.id1) }, (err, res1) => {
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
        dbcon.collection('EmployeeDetails').findOne({ _id: ObjectId(req.params.id) }, (err, res1) => {
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
            dbcon.collection('EmployeeDetails').findOne({ _id: ObjectId(req.params.id1) }, (err, res1) => {
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
                dbcon.collection('EmployeeDetails').deleteOne({ _id: ObjectId(req.params.id1) }, (err, res1) => {
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
        dbcon.collection('EmployeeDetails').find({}).toArray((err, res1) => {
            if (err) throw err;
            res.render('index', { tableArray: res1, name: req.session.name, mode: "employees" });
        })
    }
    else {
        res.render('unauthorized')
    }

})




app.get('/', (req, res) => {
    req.session.auth = false;
    res.render('login', { errDesc: "" });
})




app.get('/form', (req, res) => {
    if (req.session.auth == true) {
        dbcon.collection('EmployeeDetails').find({}).sort({ EmpID: -1 }).limit(1).toArray((err, res1) => {
            if (err) throw err;
            res.render('form', { name: req.session.name, "EmpID": res1[0].EmpID + 1, mode: "newForm" })
        })

    }
    else {
        res.render('unauthorized')
    }
})




app.post('/', (req, res) => {
    dbcon.collection("users").findOne({ email: req.body.email }, (err, res1) => {
        if (err) throw err;
        if (!res1) {
            res.render('login', { errDesc: "Inavlid User!" })
        }
        else {
            var passMatch = bcrypt.compare(req.body.password, res1.password);
            passMatch.then((val) => {
                if (!val) {
                    res.render('login', { errDesc: "Inavlid Password!" })
                }
                else {
                    req.session.auth = true;
                    req.session.name = res1.name;
                    res.redirect("/home")
                }
            })

        }
    })
})



app.post('/save', (req, res) => {
    if (req.session.auth) {
        var empObject = {
            "Employee_Name": req.body.Employee_Name,
            "EmpID": parseInt(req.body.EmpID),
            "MarriedID": (req.body.MaritalDesc == 'Married') ? 1 : 0,
            "MaritalStatusID": (req.body.MaritalDesc == 'Single') ? 1 : 0,
            "GenderID": (req.body.Sex == "F") ? 1 : 0,
            "EmpStatusID": req.body.EmpStatusID,
            "DeptID": req.body.DeptID,
            "PerfScoreID": req.body.PerfScoreID,
            "FromDiversityJobFairID": req.body.FromDiversityJobFairID,
            "Salary": req.body.Salary ?? "NA",
            "Termd": req.body.Termd,
            "PositionID": req.body.PositionID,
            "Position": req.body.Position,
            "State": req.body.State ?? "NA",
            "Zip": req.body.Zip ?? "NA",
            "DOB": req.body.DOB,
            "Sex": req.body.Sex,
            "MaritalDesc": req.body.MaritalDesc,
            "CitizenDesc": req.body.CitizenDesc,
            "HispanicLatino": req.body.HispanicLatino,
            "RaceDesc": req.body.RaceDesc,
            "DateofHire": req.body.DateofHire.replace(/-/g,"/"),
            "DateofTermination": req.body.DateofTermination,
            "TermReason": req.body.TermReason,
            "EmploymentStatus": req.body.EmploymentStatus,
            "Department": req.body.Department,
            "ManagerName": req.body.ManagerName,
            "ManagerID": req.body.ManagerID,
            "RecruitmentSource": req.body.RecruitmentSource,
            "PerformanceScore": req.body.PerformanceScore,
            "EngagementSurvey": req.body.EngagementSurvey,
            "EmpSatisfaction": req.body.EmpSatisfaction,
            "SpecialProjectsCount": req.body.SpecialProjectsCount,
            "LastPerformanceReview_Date": req.body.LastPerformanceReview_Date,
            "DaysLateLast30": req.body.DaysLateLast30,
            "Absences": req.body.Absences

        }

        if (req.body.monid) {
            dbcon.collection("EmployeeDetails").updateOne({ "_id": ObjectId(req.body.monid) }, { $set: empObject }, function (err, res1) {
                if (err) throw err;
                console.log("1 document Updated");
                res.redirect("/data")
            });
        }
        else {
            empObject.Employee_Name = req.body.fname + ", " + req.body.lname;
            dbcon.collection("EmployeeDetails").insertOne(empObject, function (err, res1) {
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

    if (req.body.ename.match(/[0-9]/)) {
        res.render('register', { errDesc: "Only alphabets are allowed in Full Name field" })
    }
    else {
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
                        var passHash = bcrypt.hash(newUser.password, 10);
                        passHash.then((val) => {
                            newUser.password = val;
                            dbcon.collection('users').insertOne(newUser, (err, res1) => {
                                req.session.auth = true;
                                req.session.name = req.body.ename;
                                res.redirect('/data')
                            })
                        })

                    }

                }
            }
        })
    }


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
