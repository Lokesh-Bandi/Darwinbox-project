var express = require('express')
var router = express.Router()

var session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const database = require('./database');


router.use(express.static('public'));

router.use(session({
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


router.use(async (req, res, next) => {
    try {
        await database.connectDB(); 
    } catch (error) {
        console.log(error)
    }
    next()
})


router.post('/:id/:id1/:id2?', (req, res) => {
    var mode = req.params.id;
    var empid = req.params.id1;
    var taskid = req.params.id2;
    if (mode == "create") {
        var taskObj = {
            "achieverID": database.ObjectId(empid),
            "achieverName": req.body.achieverName,
            "taskTitle": req.body.taskTitle,
            "taskDesc": req.body.taskDesc,
            "taskStatus": false

        }
        database.getDB().collection('tasksDB').insertOne(taskObj, (err, res1) => {
            if (err) throw err;
            res.redirect("/displayData/employees/" + empid)
        })
    }
    else if (mode == "alive") {
        database.getDB().collection('tasksDB').updateOne({ _id: database.ObjectId(taskid) }, { $set: { taskStatus: true } }, (err, res1) => {
            if (err) throw err;
            res.redirect("/displayData/employees/" + empid);
        })
    }
    else{
        database.getDB().collection('tasksDB').updateOne({ _id: database.ObjectId(taskid) }, { $set: { taskStatus: false } }, (err, res1) => {
            if (err) throw err;
            res.redirect("/displayData/employees/" + empid);
        })
    }
})

module.exports = router