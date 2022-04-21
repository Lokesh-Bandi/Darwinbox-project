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


router.get("/", (req, res) => {
    res.render('register', { errDesc: "" });
})


router.post("/registerSave", (req, res) => {


    if (req.body.ename == "" || req.body.email == "" || req.body.password == "" || req.body.cPassword == "") {
        res.json(
            {
                msg: "Fields should not be empty"
            }
        )
    }
    if (req.body.ename.match(/[0-9]/)) {
        res.json(
            {
                msg: "Only alphabets are allowed in Full Name field"
            }
        )
    }

    else {
        database.getDB().collection('users').findOne({ email: req.body.email }, (err, res1) => {
            if (err) {
                throw err
            }
            else {
                if (res1) {
                    res.json({ msg: "Username Already Exists" })
                }
                else {
                    if (req.body.password != req.body.cPassword) {
                        res.json({ msg: "Password mismatch" })
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
                            database.getDB().collection('users').insertOne(newUser, (err, res1) => {
                                req.session.auth = true;
                                req.session.name = req.body.ename;
                                res.json({
                                    msg: "success"
                                })
                            })
                        })

                    }

                }
            }
        })
    }


})


module.exports = router