const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const User = require('../models/user');
const Task = require('../models/task');

function getParam(param) {
    return eval('(' + param + ')');
}

/**
 * @desc for create user
 * @route /api/user
 * @access Public
 */

 exports.createUser = asyncHandler(async (req,res) => {
    if (req.body.name && req.body.email) {
        //Date Created should not be sent out on post request and should be set to current date
        if (req.body.dateCreated) {
            delete req.body.dateCreated;
        }
        const {name, email, pendingTasks} = req.body;
        const dateCreated = new Date();
        console.log("Date created "+ dateCreated);
        const _id = new mongoose.Types.ObjectId();
        const email_exist = await User.findOne({email: email});
        if(email_exist){
            res.status(404).json({
                message: 'An user with this email ID already exists. Please use another email.',
                data: {}
            })
        }
        const user =  User.create({_id, name, email, pendingTasks, dateCreated}, function (err, user) {
            if (err) {
                if (Object.keys(err.errors).some(error => {
                    return err.errors[error].name === 'CastError'
                })) {
                    res.status(404).json({
                        message: 'A user field is of the wrong type in the requets sent',
                        data: {}
                    })
                } else {
                    res.status(404).json({
                        message: 'There is an error creating the user',
                        data: {}
                    })
                }}
            else{
                res.status(201).json({
                    message: 'User created successfully.',
                    data: user
                })
            }} );
        
    }else{
        res.status(400).json({
            message: 'Creating a user requires name and email',
            data: {}
        })
    }
    
})


/**
 * @desc for update user
 * @route /api/user/:id
 * @access Public
 */

 exports.updateUser = asyncHandler(async (req,res) => {
    const {name, email} = req.body;
    if (name && email) {
        if (req.body._id) {
            delete req.body._id;
        }
             const existUser = await User.findOne({_id: req.params.id});
             if(existUser){
                const updatedUser = await User.updateOne({_id: req.params.id}, {$set: req.body});
                const fin_data = await User.findOne({_id: req.params.id})
                res.status(200).json({
                    message: 'User is updated successfully.',
                    data: fin_data
                })
            }
            else{
                res.status(404).json({
                    message: 'User Not Found',
                    data: null
                })
            }
    }else{
        res.status(404).json({
            message: 'To replace the user, name and email is required.',
            data: null
        })
    }
    
})



/**
 * @desc for delete user
 * @route /api/user/:id
 * @access Public
 */

 exports.deleteUser = asyncHandler(async (req,res) => {
    const existUser = await User.findOne({_id: req.params.id});
    if(existUser){
        var tasks = {}
            for(var i=0;i<existUser.pendingTasks.length;i++){
                const updated_task = await Task.updateOne({_id: existUser.pendingTasks[i]}, { $set: {assignedUser: "",assignedUserName: "unassigned"}});
                tasks[i] = updated_task;
                //console.log("Updated task "+ JSON.stringyfy(updated_task));
            }
            await existUser.remove();
            res.status(200).json({
                message: 'User is deleted successfully and the following tasks for this user were updated successfully.',
                data : tasks
            })      
    }
    else{
        res.status(404).json({
            message: 'User Not Found.',
            data: null
        })
    }
})




/**
 * @desc for get user
 * @route /api/users/:id
 * @access Public
 */

 exports.getSingleUser = asyncHandler(async (req,res) => {
    const existUser = await User.findOne({_id: req.params.id}).select(getParam(req.query.select));
    if(existUser){
        res.status(200).json({
            message: 'User is fetched',
            data: existUser
        })
    }
    else{
        res.status(404).json({
            message: 'User Not Found',
            data: null
        })
    }
})


/**
 * @desc for getting all users
 * @route /api/users
 * @access Public
 */

 exports.getAllUsers = asyncHandler(async (req,res) => {
    if (req.query.count == 'true') {
        const num =  await User.count(getParam(req.query.where))
             if(num) {
                 res.status(201).json({
                     message: "Count of requested users documents",
                     data: num
                 })
             }else {
                     res.status(500).json({
                         message: 'Server Error.',
                         data: {}
                     })
                 }
     }
     else{
         const users = await User.find(getParam(req.query.where), function (err, docs) {
            if (err) {
                if (err.name === 'CastError' && err.path === '_id') {
                    res.status(500).json({
                        message: 'The _id entered in the query, cannot not be casted to ObjectID in mongoose',
                        data: {}
                    })
                } else if (err.name === 'CastError') {
                    res.status(500).json({
                        message: 'Check the casting of the fields in the request. One of them might be wrong',
                        data: {}
                    })
    
                } else {
                    res.status(500).json({
                        message: 'Server error',
                        data: {}
                    })
                }}})
             .select(getParam(req.query.select))
             .skip(parseInt(req.query.skip))
             .sort(getParam(req.query.sort))
             .limit(parseInt(req.query.limit))
         if(users !== undefined && users.length !== 0){
             res.status(201).json({
                 message: "Fetched all users based on queries sent",
                 data: users
             })         
         }
         else {
             res.status(404).json({
                 message: "Check the query parameters to get the correct result.",
                 data: {}
             })  
         }
     }
})