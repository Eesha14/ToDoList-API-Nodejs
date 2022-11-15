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
                    });
                }
            }
            if (task.assignedUser) {
                const user = User.findOne({_id : task.assignedUser}, function(err, user){
                    if (user) {
                        user.pendingTasks.push(task._id);
                        user.save();
                        res.status(200).json({
                            message: 'Task created and assigned to user',
                            data: task
                        })
                    }else{
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
    if (req.body._id) {
        delete req.body._id;
    }
    const {name, deadline} = req.body;
    if (name && deadline) {
             const existTask = Task.findOne({_id: req.params.id}, function(err, existTask){
                if(existTask){
                    //console.log("Exist task"+ existTask);
                    if(existTask.assignedUser!="" && existTask.assignedUserName!=req.body.assignedUserName){
                        const old_user = User.findOne({_id:mongoose.Types.ObjectId(existTask.assignedUser)}, function(err, old_user){
                            //console.log("Old user "+ old_user);
                                const index = old_user.pendingTasks.indexOf(req.params.id);
                                if (index > -1) { 
                                    old_user.pendingTasks.splice(index, 1); 
                                }
                                console.log("Old user updated pending tasks. "+ old_user.pendingTasks);
                                const update_old_user = User.updateOne({_id: old_user._id}, {$set : {"pendingTasks": old_user.pendingTasks} }).then(
                                    (result) => {
                                        console.log(result);
                                    }
                                );
                         });
                        }
                    if(req.body.assignedUser || req.body.assignedUserName){
                        
                        const new_user = User.findOne({_id:mongoose.Types.ObjectId(req.body.assignedUser)}, function(err, new_user){
                            //console.log("New User "+ new_user)
        
                                    if(new_user && (new_user.name == req.body.assignedUserName)){
                                        const new_pending = new_user.pendingTasks.push(req.params.id);
                                        const update_user = User.updateOne({_id: new_user._id}, {$set : {"pendingTasks": new_user.pendingTasks} }).then(
                                            (result) => {
                                                console.log(result);
                                            }
                                        );
                                       }
                                    else{
                                        res.status(404).json({
                                            message: 'Task cannot be updated as that user does not exist.',
                                            data: {}
                                        });
                                    }

                        });
                        const updatedTask = Task.updateOne({_id: req.params.id}, {$set : req.body}).then(
                            (result) => {
                                console.log(result);
                                res.status(200).json({
                                    message: 'Task is updated successfully and added to the users pending task list if the status of completed is false',
                                    data: {}
                                });
                            }
                        );
                    }
                    else{
                    const updatedTask = Task.updateOne({_id: req.params.id}, {$set : req.body}).then(
                        (result) => {
                            console.log(result);
                            res.status(200).json({
                                data: {},
                                message: 'Task is updated successfully.'
                            })
                        }
                    );
                 }
                }
                else{
                    res.status(404).json({
                        message: 'Task Not Found',
                        data: null
                    })
                }
             });
             
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
            const updatedUser = await User.updateOne({ pendingTasks: { $elemMatch: { $eq: req.params.id} }},
                { $pullAll: { pendingTasks: [req.params.id] } });
            await existTask.remove();
            res.status(200).json({
                message: 'Task is deleted successfully and removed from the assignedUser pendingtasks',
                data : {}
            });
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
        const tasks = await Task.find(getParam(req.query.where))
            .select(getParam(req.query.select))
            .skip(parseInt(req.query.skip))
            .sort(getParam(req.query.sort))
            .limit(parseInt(req.query.limit))
           // console.log("Task skip "+tasks)
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