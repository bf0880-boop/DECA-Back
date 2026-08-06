const authService = require('../services/auth.service');
const { ok, catchAsync } = require('../utils/response');

const signup = catchAsync(async (req, res) => {
  const user = await authService.signup(req.body);
  return ok(res, user, 201);
});

const verify = catchAsync(async (req, res) => {
  const user = await authService.verifyCode(req.body);
  return ok(res, user);
});

const resendCode = catchAsync(async (req, res) => {
  await authService.resendCode(req.body.email);
  return ok(res, { message: 'Codigo reenviado' });
});

const login = catchAsync(async (req, res) => {
  const { token, user } = await authService.login(req.body);
  return ok(res, { token, user });
});

module.exports = { signup, verify, resendCode, login };
