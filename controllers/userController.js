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
        const {name, email, pendingTasks, dateCreated} = req.body;
        const email_exist = await User.findOne({email: email});
        if(email_exist){
            res.status(404).json({
                message: 'An user with this email ID already exists. Please use another email.',
                data: {}
            }).end();
        }
         const user = await User.create({
            _id: new mongoose.Types.ObjectId(),
            name: req.body.name,
            email: req.body.email,
            pendingTasks: req.body.pendingTasks || []});
            res.status(201).json({
                message: 'User created successfully',
                data: user
            }).end();
        
    }else{
        res.status(400).json({
            message: 'Creating a user requires name and email',
            data: {}
        }).end();
    }
    
});


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
            User.findOneAndUpdate({_id: req.params.id}, req.body, {new: true}, function (err, updateduser) {
                if (err) {
                        res.status(404).json({
                        message: 'The user is not found.',
                        data: {}
                        })
                }else{
                    Task.updateMany({_id: {$in: updateduser.pendingTasks }}, 
                        { 
                        assignedUser: updateduser._id, 
                        assignedUserName: req.body.name },
                        function(err,tasks) {
                            res.status(200).json({
                                message: 'The user is updated with new pending tasks and the respective new tasks have been updated with this username and userid',
                                data: updateduser
                            });
                        });
                    }
                })}
    else{
        res.status(404).json({
            message: 'To replace the user, name and email is required.',
            data: null
        });
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
                const updated_task = await Task.updateOne({_id: mongoose.Types.ObjectId(existUser.pendingTasks[i])}, { $set: {assignedUser: "",assignedUserName: "unassigned"}});
                tasks[i] = updated_task;
                //console.log("Updated task "+ JSON.stringyfy(updated_task));
            }
            await existUser.remove();
            res.status(200).json({
                message: 'User is deleted successfully and the following tasks for this user were updated successfully.',
                data : {}
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
         const users = await User.find(getParam(req.query.where))
             .select(getParam(req.query.select))
             .skip(parseInt(req.query.skip))
             .sort(getParam(req.query.sort))
             .limit(parseInt(req.query.limit));
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