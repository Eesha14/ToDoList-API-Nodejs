const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const Task = require('../models/task');
const User = require('../models/user');

function getParam(param) {
    return eval('(' + param + ')');
}

/**
 * @desc for create task
 * @route /api/task
 * @access Public
 */

exports.createTask = asyncHandler(async (req,res) => {
  if(req.body.name && req.body.deadline){
    if (req.body.dateCreated) {
        delete req.body.dateCreated;
    }
    if( req.body.assignedUser != ""){
        const user = await User.findOne({_id:req.body.assignedUser});
        if(!user){
            res.status(404).json({
                message: 'Plese set the assignedUser id correctly as no such user exists',
                data: {}
            })
        }
        if(user.name != req.body.assignedUserName){
            res.status(404).json({
                message: 'The assignedUserName do not belong to same user.',
                data: {}
            })
        }
    }
    if(req.body.assignedUserName != ""){
        const user = await User.findOne({name:req.body.assignedUserName});
        if(!user){
            res.status(404).json({
                message: 'Plese set the assignedUserName correctly as no such user exists',
                data: {}
            })
        }
        if(user._id != req.body.assignedUser){
            res.status(404).json({
                message: 'The assignedUser ID do not belong to same user.',
                data: {}
            })
        }
    }
        const {name, description, deadline, completed, assignedUser, assignedUserName} = req.body;
        const dateCreated = new Date();
        const task =  Task.create({name, description, deadline, completed, assignedUser,assignedUserName, dateCreated}, function (err, task) {
            if (err) {
                if (Object.keys(err.errors).some(error => {
                    return err.errors[error].name === 'CastError'
                })) {
                    res.status(404).json({
                        message: 'One of the task field is of the wrong type. Please check and send correct request',
                        data: {}
                    })
                } else {
                    res.status(404).json({
                        message: 'Error occured in creating the task',
                        data: {}
                    })
                }
            }
            if (task.assignedUser) {
                console.log("The task assigned user is: "+ task.assignedUser);
                const user = User.findOne({_id : task.assignedUser}, function(err, user){
                    console.log("The user is: "+ user);
                    if (user) {
                        console.log("The current pending tasks is: "+ user.pendingTasks);
                        user.pendingTasks.push(task._id);
                        user.save();
                        res.status(200).json({
                            message: 'Task created and assigned to user',
                            data: task
                        })
                    }else{
                        console.log('This assignedUser does not exist.');
                        task.assignedUser = "";
                        task.assignedUserName = "unassigned";
                        task.save();
                        res.status(200).json({
                            message: 'The assignedUser does not exist but task successfully created',
                            data: task
                        })
                    }
                });
                
            }else{
                res.status(201).json({
                    message: 'Task is created successfully.',
                    data: task
                })
            }
        } );
    }else{
        res.status(404).json({
            message: 'Creating a task requires name and deadline',
            data: {}
        })
    }
    
})


/**
 * @desc for update task
 * @route /api/task/:id
 * @access Public
 */

 exports.updateTask = asyncHandler(async (req,res) => {
    const {name, deadline} = req.body;
    if (name && deadline) {
             const existTask = await Task.findOne({_id: req.params.id});
             if(existTask){
                const updatedTask = await Task.updateOne({_id: req.params.id}, {$set : req.body});
                const fin_data = await Task.findOne({_id: req.params.id})
                res.status(200).json({
                    data: fin_data,
                    message: 'Task is updated successfully.'
                })
            }
            else{
                res.status(404).json({
                    message: 'Task Not Found',
                    data: null
                })
            }
    }else{
        res.status(404).json({
            message: 'To replace the task, name and deadline is required.',
            data: null
        })
    }
    
})


/**
 * @desc for delete task
 * @route /api/task/:id
 * @access Public
 */

exports.deleteTask = asyncHandler(async (req,res) => {
    const existTask = await Task.findOne({_id: req.params.id});
    if(existTask){
        const user = await User.findOne({_id: existTask.assignedUser});
        if(user){
            const index = user.pendingTasks.indexOf(req.params.id);
            if (index > -1) { // only splice array when item is found
                var result = user.pendingTasks.filter(function(x) {
                    return x !== req.params.id;
                });
            }
            console.log("Users updated pending tasks "+ result);
            const updatedUser = await User.updateOne({_id: existTask.assignedUser}, {pendingTasks: result});
            const fin_data = await User.findOne({_id: req.params.id})
            await existTask.remove();
            res.status(200).json({
                message: 'Task is deleted successfully and removed from the assignedUser pendingtasks',
                data : fin_data
            })
        }else{
            await existTask.remove();
            res.status(200).json({
                message: 'Task is deleted successfully and assignedUser did not exist for this task',
                data : user
            })
        }
        
    }
    else{
        res.status(404).json({
            message: 'Task Not Found',
            data: null
        })
    }
})


/**
 * @desc for get task
 * @route /api/task/:id
 * @access Public
 */

 exports.getSingleTask = asyncHandler(async (req,res) => {
    const existTask = await Task.findOne({_id: req.params.id}).select(getParam(req.query.select));
    if(existTask){
        res.status(200).json({
            message: 'Task is fetched',
            data: existTask
        })
    }
    else{
        res.status(404).json({
            message: 'Task Not Found',
            data: {}
        })
    }
})



/**
 * @desc for getting all tasks
 * @route /api/task
 * @access Public
 */

 exports.getAllTasks = asyncHandler(async (req,res) => {
    if (req.query.count == 'true') {
       const num =  await Task.count(getParam(req.query.where))
            if(num) {
                res.status(201).json({
                    message: "Count of requested tasks documents",
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
        const tasks = await Task.find(getParam(req.query.where), function (err, docs) {
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
                }
            }})
            .select(getParam(req.query.select))
            .skip(parseInt(req.query.skip))
            .sort(getParam(req.query.sort))
            .limit(parseInt(req.query.limit))
            console.log("Task skip "+tasks)
        if(tasks !== undefined && tasks.length !== 0){
            res.status(201).json({
                message: "Fetched all tasks based on queries sent",
                data: tasks
            })         
        }
        else {
            res.status(404).json({
                message: "Check the query parameters to get the correct result",
                data: {}
            })  
        }
    }
})