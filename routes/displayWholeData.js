var express = require('express')
var router = express.Router()

var session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const database = require('./database');


router.use(express.static('public'));
router.use('/employees',express.static('public'))

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
        console.log(err)
    }
    next()
})


router.get('/:id/:id1', async (req, res) => {

    let empData;
    let taskData;
    try {
        empData = await database.getDB().collection('EmployeeDetails').findOne({ _id: database.ObjectId(req.params.id1) })
        taskData = await database.getDB().collection('tasksDB').find({ achieverID: database.ObjectId(req.params.id1) }).toArray()
    } catch (error) {
        console.log(error)
    }
    console.log(taskData)
    res.render('disableForm', { "editObject": empData, name: req.session.name, "tasks": taskData });

})

module.exports = router