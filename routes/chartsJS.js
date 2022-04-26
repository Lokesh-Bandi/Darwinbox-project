var express = require('express')
var router = express.Router()

var session = require('express-session');
const database = require('./database');
const { v4: uuidv4 } = require('uuid');


router.use(express.static('public'));
router.use("/CompareAnalytics", express.static('public'));


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
    await database.connectDB();
    next()
})

router.get("/managerAnalysis", async (req, res) => {

    if(req.query.manager1=='None' || req.query.manager2=='None'){
        res.json({
            msg:"Fields Must Not Be Empty"
        })
    }
    else{
        let emp1;
    let emp2;
    let males1 = await database.getDB().collection('EmployeeDetails').find({ ManagerName: req.query.manager1, Sex: 'M' }).count()
    let males2 = await database.getDB().collection('EmployeeDetails').find({ ManagerName: req.query.manager2, Sex: 'M' }).count()
    let females1 = await database.getDB().collection('EmployeeDetails').find({ ManagerName: req.query.manager1, Sex: 'F' }).count()
    let females2 = await database.getDB().collection('EmployeeDetails').find({ ManagerName: req.query.manager1, Sex: 'F' }).count()
    let labels=["AvgEmployeeSatisfaction(/100)","NumberOfEmps","MaxSalary(* 1000)","MinSalary(* 1000)","AvgSalary(* 1000)","Males","Females"]
    let pipeline1 = [
        {
            '$match': {
                'ManagerName': req.query.manager1
            }
        }, {
            '$group': {
                '_id': null,
                'AvgEmployeeSatisfaction': {
                    '$avg': '$EmpSatisfaction'
                },
                'NumberOfEmps': {
                    '$sum': 1
                },
                'MaxSalary': {
                    '$max': '$Salary'
                },
                'MinSalary': {
                    '$min': '$Salary'
                },
                'AvgSalary': {
                    '$avg': '$Salary'
                }
            }
        },{
            '$project': {
              '_id': 0
            }
          }
    ]
    let pipeline2 = [
        {
            '$match': {
                'ManagerName': req.query.manager2
            }
        }, {
            '$group': {
                '_id': null,
                'AvgEmployeeSatisfaction': {
                    '$avg': '$EmpSatisfaction'
                },
                'NumberOfEmps': {
                    '$sum': 1
                },
                'MaxSalary': {
                    '$max': '$Salary'
                },
                'MinSalary': {
                    '$min': '$Salary'
                },
                'AvgSalary': {
                    '$avg': '$Salary'
                }
            }
        },{
            '$project': {
              '_id': 0
            }
          }
    ]

    try {
        var requiredData1 = await database.getDB().collection('EmployeeDetails').aggregate(pipeline1).toArray()
        var requiredData2 = await database.getDB().collection('EmployeeDetails').aggregate(pipeline2).toArray()
        requiredData1[0].AvgEmployeeSatisfaction=requiredData1[0].AvgEmployeeSatisfaction*20
        requiredData2[0].AvgEmployeeSatisfaction=requiredData2[0].AvgEmployeeSatisfaction*20
        emp1 = Object.values(requiredData1[0])
        emp2 = Object.values(requiredData2[0])
        for(let i=2;i<emp1.length;i++){
            emp1[i]=emp1[i]/1000
            emp2[i]=emp2[i]/1000
        }
        emp1.push(males1,females1)
        emp2.push(males2,females2)
    }
    catch (err) {
        console.log(err)
    }

    res.json({
        msg:"Success",
        empName1:req.query.manager1,
        empName2:req.query.manager2,
        labels:labels,
        emp1:emp1,
        emp2:emp2
    })
    }
    

})

router.get('/deptAnalysis', async (req, res) => {
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

    try {
        var requiredData = await database.getDB().collection('EmployeeDetails').aggregate(pipeline).toArray()
    }
    catch (err) {
        console.log(err)
    }

    res.json({
        data: requiredData,
    })
})


router.get("/analytics", async (req, res) => {
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
    let requiredData;
    try {
        requiredData = await database.getDB().collection('EmployeeDetails').aggregate(pipeline).toArray()
    }
    catch (err) {
        console.log(err)
    }

    requiredData.forEach((res1) => {
        labels.push(res1['_id'])
        dataSet.push(res1['Count'])
    })
    res.render('charts', { labels: labels, dataSet: dataSet, name: req.session.name })
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
            database.getDB().collection("EmployeeDetails").aggregate(avgPipeline).toArray((err, res1) => {
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
        database.getDB().collection("EmployeeDetails").findOne({ _id: database.ObjectId(req.params.id) }, { projection: { _id: 0, EmpSatisfaction: 1, SpecialProjectsCount: 1, DaysLateLast30: 1, Absences: 1 } }, (err, res1) => {
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



router.get("/1vs1Analytics", async (req, res) => {
    var labels = ['EmpSatisfaction', 'SpecialProjectsCount', 'DaysLateLast30', 'Absences'];
    var empData1;
    var empData2;

    try {
        empData1 = await database.getDB().collection('EmployeeDetails').findOne({ EmpID: parseInt(req.query.emp1) }, { projection: { _id: 0, EmpSatisfaction: 1, SpecialProjectsCount: 1, DaysLateLast30: 1, Absences: 1 } })
        empData2 = await database.getDB().collection('EmployeeDetails').findOne({ EmpID: parseInt(req.query.emp2) }, { projection: { _id: 0, EmpSatisfaction: 1, SpecialProjectsCount: 1, DaysLateLast30: 1, Absences: 1 } })
    }
    catch (err) {
        console.log(err)
    }

    res.render('compareCharts', { labels: labels, dataSet: Object.values(empData1), name: req.session.name, avgResults: Object.values(empData2), mode: "1vs1Compare", emp1_Id: req.query.emp1, emp2_Id: req.query.emp2 })
})



module.exports = router

