var MongoClient = require('mongodb').MongoClient;
const MongoStore = require('connect-mongo');
var ObjectId = require("mongodb").ObjectId;

var url = "mongodb://localhost:27017/FullAssignment";
let dbcon;

module.exports.connectDB= async ()=>{
    const db= await MongoClient.connect(url);
    dbcon=db.db('FullAssignment')
}

module.exports.getDB=()=>{
    return dbcon;
}

module.exports.url=url;

exports.MongoStore=MongoStore;
exports.ObjectId=ObjectId;