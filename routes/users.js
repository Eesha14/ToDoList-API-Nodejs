const express = require('express');
const router = express.Router();

const {createUser, updateUser, deleteUser, getSingleUser, getAllUsers} = require('../controllers/userController');

router.route('/').post(createUser);
router.route('/:id').put(updateUser);
router.route('/:id').delete(deleteUser);
router.route('/:id').get(getSingleUser);
router.route('/').get(getAllUsers);

module.exports = router;