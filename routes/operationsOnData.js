var express = require('express')
var router = express.Router()

var session = require('express-session');
const { v4: uuidv4 } = require('uuid');
var bcrypt = require('bcryptjs');
const database = require('./database');


router.use(express.static('public'));
router.use('/edit', express.static('public'));


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


router.get('/delete/:id/:id1', (req, res) => {
    if (req.params.id == "trashbin") {
        database.getDB().collection('trashbin').deleteOne({ "_id": database.ObjectId(req.params.id1) }, (err, res1) => {
            if (err) throw err;
            res.redirect('/trash')
        })
    }
    else {

        // Running Queries using promises(enhances the asynchronous execution)

        const empPromiseFind = new Promise((resolve, reject) => {
            database.getDB().collection('EmployeeDetails').findOne({ _id: database.ObjectId(req.params.id1) }, (err, res1) => {
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
                database.getDB().collection('trashbin').insertOne(result, (err, res1) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(res1);
                    }
                })
            });
            const empPromiseDelete = new Promise((resolve, reject) => {
                database.getDB().collection('EmployeeDetails').deleteOne({ _id: database.ObjectId(req.params.id1) }, (err, res1) => {
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

    }

});

router.get('/edit/:id', (req, res) => {
    const empPromiseFind = new Promise((resolve, reject) => {
        database.getDB().collection('EmployeeDetails').findOne({ _id: database.ObjectId(req.params.id) }, (err, res1) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(res1);
            }
        })
    })
    const deptPromiseFind = new Promise((resolve, reject) => {
        database.getDB().collection('departments').find({}).toArray((err, res1) => {
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

})


router.get('/restore/:id', (req, res) => {

    // Running Queries using promises(enhances the asynchronous execution)

    const trashPromiseFind = new Promise((resolve, reject) => {
        database.getDB().collection('trashbin').findOne({ "_id": database.ObjectId(req.params.id) }, (err, res1) => {
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
            database.getDB().collection('EmployeeDetails').insertOne(result, (err, res1) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(res1);
                }
            })
        });
        const trashPromiseDelete = new Promise((resolve, reject) => {
            database.getDB().collection('trashbin').deleteOne({ _id: database.ObjectId(req.params.id) }, (err, res1) => {
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

})



router.post('/save', async(req, res) => {
    console.log(req.body.ManagerName)
    var managerDetails=await database.getDB().collection('ManagersDB').findOne({Manager_Name:req.body.ManagerName})
    console.log(managerDetails)
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
            "Salary": parseInt(req.body.Salary),
            "Termd": req.body.Termd,
            "PositionID": req.body.PositionID,
            "Position": req.body.Position,
            "State": req.body.State,
            "Zip": req.body.Zip,
            "DOB": req.body.DOB,
            "Sex": req.body.Sex,
            "MaritalDesc": req.body.MaritalDesc,
            "CitizenDesc": req.body.CitizenDesc,
            "HispanicLatino": req.body.HispanicLatino,
            "RaceDesc": req.body.RaceDesc,
            "DateofHire": req.body.DateofHire.replace(/-/g, "/"),
            "DateofTermination": req.body.DateofTermination,
            "TermReason": req.body.TermReason,
            "EmploymentStatus": req.body.EmploymentStatus,
            "Department": req.body.Department,
            "ManagerName": req.body.ManagerName,
            "ManagerID": parseInt(managerDetails._id),
            "RecruitmentSource": req.body.RecruitmentSource,
            "PerformanceScore": req.body.PerformanceScore,
            "EngagementSurvey": req.body.EngagementSurvey,
            "EmpSatisfaction": parseInt(req.body.EmpSatisfaction),
            "SpecialProjectsCount": req.body.SpecialProjectsCount,
            "LastPerformanceReview_Date": req.body.LastPerformanceReview_Date,
            "DaysLateLast30": req.body.DaysLateLast30,
            "Absences": req.body.Absences

        }

        if (req.body.monid) {
            database.getDB().collection("EmployeeDetails").updateOne({ "_id": database.ObjectId(req.body.monid) }, { $set: empObject }, function (err, res1) {
                if (err) throw err;
                console.log("1 document Updated");
                res.redirect("/data")
            });
        }
        else {
            empObject.Employee_Name = req.body.fname + ", " + req.body.lname;
            database.getDB().collection("EmployeeDetails").insertOne(empObject, function (err, res1) {
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





module.exports = router