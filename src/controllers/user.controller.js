const userService = require('../services/user.service');
const { ok, catchAsync } = require('../utils/response');

const getMe = catchAsync(async (req, res) => {
  const user = await userService.getProfile(req.user.id);
  return ok(res, user);
});

const updateMe = catchAsync(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  return ok(res, user);
});

module.exports = { getMe, updateMe };
