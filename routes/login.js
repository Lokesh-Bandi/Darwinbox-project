var express = require('express')
var router = express.Router()

var session = require('express-session');
const { v4: uuidv4 } = require('uuid');
var bcrypt = require('bcryptjs');
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


router.get('/', (req, res) => {
    req.session.auth = false;
    res.render('login');
})


router.post('/', async(req, res) => {

    var userData;
    try {
        userData=await database.getDB().collection("users").findOne({ email: req.body.email })
    } catch (error) {
        console.log(error)
    }

    if (userData == null) {
        res.json({
            msg: "Invalid Username"
        })
    }
    else {
        var passMatch = bcrypt.compare(req.body.password, userData.password);
        passMatch.then((val) => {
            if (!val) {
                res.json({
                    msg: "Invalid Password"
                })
            }
            else {
                req.session.auth = true;
                req.session.name = userData.name;
                res.json({
                    msg: "success"
                })
            }
        })

    }
})


module.exports = router