var express = require('express')
var example=require('./ex.js')
var session = require('express-session');
const MongoStore = require('connect-mongo');
var router = express.Router()
var ObjectId = require("mongodb").ObjectId;
var url = "mongodb://localhost:27017/FullAssignment";
let dbcon;
var MongoClient = require('mongodb').MongoClient;

MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    dbcon = db.db("FullAssignment");
});
router.use(session({
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

router.get('/deptAnalysis', (req, res) => {
    var pipeline = [
        {
            '$match': {
                'Department': req.query.dept,
            }
        }, {
            '$group': {
                '_id': '$' + req.query.analyticsType,
                'Count': {
                    '$sum': 1
                }
            }
        }
    ]
    if (req.query.empStatus) {
        pipeline[0]['$match'].EmploymentStatus = req.query.empStatus
    }
    if (req.query.martialStatus) {
        pipeline[0]['$match'].MaritalDesc = req.query.martialStatus
    }
    dbcon.collection('EmployeeDetails').aggregate(pipeline).toArray((err, res1) => {
        if (err) {
            throw err
        }
        else {
            res.json({
                data: res1,
            })
        }
    })
})


router.get("/analytics", (req, res) => {
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
        res.render('charts', { labels: labels, dataSet: dataSet, name: req.session.name })
    })
})


router.get("/CompareAnalytics/:id", (req, res) => {
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
        res.render('compareCharts', { labels: labels, dataSet: dataSet, name: req.session.name, avgResults: avgResults, mode: "avgCompare", emp1_Id: "", emp2_Id: "" })
    })
})



router.get("/1vs1Analytics", (req, res) => {
    var labels = ['EmpSatisfaction', 'SpecialProjectsCount', 'DaysLateLast30', 'Absences'];
    var emp1Promise = new Promise((resolve, reject) => {
        dbcon.collection('EmployeeDetails').findOne({ EmpID: parseInt(req.query.emp1) }, { projection: { _id: 0, EmpSatisfaction: 1, SpecialProjectsCount: 1, DaysLateLast30: 1, Absences: 1 } }, (err, res1) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(res1)
            }
        })
    })
    var emp2Promise = new Promise((resolve, reject) => {
        dbcon.collection('EmployeeDetails').findOne({ EmpID: parseInt(req.query.emp2) }, { projection: { _id: 0, EmpSatisfaction: 1, SpecialProjectsCount: 1, DaysLateLast30: 1, Absences: 1 } }, (err, res1) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(res1)
            }
        })
    })
    Promise.all([emp1Promise, emp2Promise]).then((val) => {
        res.render('compareCharts', { labels: labels, dataSet: Object.values(val[0]), name:"Name", avgResults: Object.values(val[1]), mode: "1vs1Compare", emp1_Id: req.query.emp1, emp2_Id: req.query.emp2 })
    })
})



module.exports = router

