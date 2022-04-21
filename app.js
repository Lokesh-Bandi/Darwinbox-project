var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
const { v4: uuidv4 } = require('uuid');


var chartsJS = require('./routes/chartsJS')
var database = require('./routes/database')
var displayWholeData = require('./routes/displayWholeData')
var login = require('./routes/login')
var register = require('./routes/register')
var operationsOnData = require('./routes/operationsOnData')
var tasks = require('./routes/tasks')


var app = express();


app.use(logger('tiny'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));  //to use the req.body variable when the html form is submitted
app.use(cookieParser());
app.use(express.static(path.join(__dirname,'public')));
app.use("/home",express.static(path.join(__dirname,'public')));
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
    store: database.MongoStore.create({
        mongoUrl: database.url,
    }),
}))

app.use(async (req, res, next) => {
    try {
        await database.connectDB()
    } catch (error) {
        console.log(error)
    }
    next();
})

app.use('/charts', chartsJS)
app.use('/displayData', displayWholeData)
app.use('/login', login)
app.use('/register', register)
app.use('/operations', operationsOnData)
app.use('/tasks', tasks)





app.post('/validateEmail/:id', (req, res) => {

    if (req.body.email.toLowerCase().match(/[a-z0-9]+@[a-z]+\.[a-z]{2,3}/) == null) {
        res.json(
            {
                msg: "Not in a valid email format"
            }
        )
    }
    else {
        database.getDB().collection('users').findOne({ email: req.body.email }, (err, res1) => {
            if (err) { throw err }
            if (res1 == null) {
                res.json({
                    msg: (req.params.id == "login") ? "Invalid Email" : ""
                })
            }
            else {
                res.json({
                    msg: (req.params.id == "login") ? "" : "Username already Exists"
                })
            }
        })
    }
})

app.post("/validateIDs", (req, res) => {
    var empPromise = new Promise((resolve, reject) => {
        database.getDB().collection('EmployeeDetails').findOne({ EmpID: parseInt(req.body.empID) }, (err, res1) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(res1)
            }
        })
    })
    empPromise.then((val) => {
        if (val != null) {
            res.json(
                {
                    errMsg: "",
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

app.get("/",(req,res)=>{
    res.render('login')
})

app.get('/home', (req, res) => {
    if (req.session.auth) {
        res.render('home', { name: req.session.name });
    }
    else {
        res.render('unauthorized')
    }
})

app.get('/deptartment_Analytics_Page', (req, res) => {
    database.getDB().collection('DepartmentsDB').find({}).toArray((err, res1) => {
        res.render('deptAnalytics', { name: req.session.name, depts: res1 })
    })
})

app.get('/trash', async (req, res) => {
    var trashbinData;
    try {
        trashbinData = await database.getDB().collection('trashbin').find({}).toArray();
    } catch (error) {
        alert(error)
    }
    res.render('index', { tableArray: trashbinData, name: req.session.name, mode: "trashbin" })
})

app.get('/form', (req, res) => {
    if (req.session.auth == true) {

        var deptPromise = new Promise((resolve, reject) => {
            database.getDB().collection('DepartmentsDB').find({}).toArray((err, res1) => {
                if (err) {
                    reject(err)
                }
                else {
                    resolve(res1)
                }
            })
        })
        var positionPromise = new Promise((resolve, reject) => {
            database.getDB().collection('Positions DB').find({}).toArray((err, res1) => {
                if (err) {
                    reject(err)
                }
                else {
                    resolve(res1)
                }
            })
        })
        var empIDPromise = new Promise((resolve, reject) => {
            database.getDB().collection('EmployeeDetails').find({}).sort({ EmpID: -1 }).limit(1).toArray((err, res1) => {
                if (err) {
                    reject(err)
                }
                else {
                    resolve(res1[0].EmpID + 1)
                }

            })
        })
        Promise.all([deptPromise, positionPromise, empIDPromise]).then((val) => {
            res.render('form', { name: req.session.name, "EmpID": val[2], mode: "newForm", depts: val[0], positions: val[1] })
        })


    }
    else {
        res.render('unauthorized')
    }
})

app.get('/data', (req, res) => {
    if (req.session.auth == true) {
        database.getDB().collection('EmployeeDetails').find({}).toArray((err, res1) => {
            if (err) throw err;
            res.render('index', { tableArray: res1, name: req.session.name, mode: "employees" });
        })
    }
    else {
        res.render('unauthorized')
    }

})


app.post('/unauthorized', (req, res) => {
    res.redirect('/login')
})


app.get('/logout', (req, res) => {
    req.session.destroy(function () {
        res.redirect('/login')
    })
})



module.exports = app;