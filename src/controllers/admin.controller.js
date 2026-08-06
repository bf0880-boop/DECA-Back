const User = require('../models/User');
const Patient = require('../models/Patient');
const HttpError = require('../utils/httpError');
const { hashPassword } = require('../utils/hash');
const { ok, catchAsync } = require('../utils/response');

async function createUserAsAdmin({ email, password, nombre, apellido, fechaNacimiento, dni, obraSocial, role }) {
  const existingEmail = await User.findByEmail(email);
  if (existingEmail) throw new HttpError('El email ya esta registrado', 409);

  const existingDni = await User.findByDni(dni);
  if (existingDni) throw new HttpError('El DNI ya esta registrado', 409);

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email,
    passwordHash,
    nombre,
    apellido,
    fechaNacimiento,
    dni,
    obraSocial,
    role,
  });

  // Las cuentas creadas por el administrador quedan verificadas directamente.
  await User.setVerified(user.id);
  return User.findById(user.id);
}

const createDoctor = catchAsync(async (req, res) => {
  const user = await createUserAsAdmin({ ...req.body, role: 'doctor' });
  return ok(res, user, 201);
});

const createPatient = catchAsync(async (req, res) => {
  const user = await createUserAsAdmin({ ...req.body, role: 'patient' });
  await Patient.createRecord(user.id, req.body.doctorId || null);
  return ok(res, user, 201);
});

const listUsers = catchAsync(async (req, res) => {
  const { role } = req.query;
  if (!role || !['doctor', 'patient', 'admin'].includes(role)) {
    throw new HttpError('Debes indicar un role valido (doctor, patient o admin)', 400);
  }
  const users = await User.listByRole(role);
  return ok(res, users);
});

const assignDoctor = catchAsync(async (req, res) => {
  const patientId = Number(req.params.id);
  const { doctorId } = req.body;

  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.role !== 'doctor') throw new HttpError('Medico invalido', 400);

  const patientRecord = await Patient.assignDoctor(patientId, doctorId);
  if (!patientRecord) throw new HttpError('Paciente no encontrado', 404);

  return ok(res, patientRecord);
});

const deleteUser = catchAsync(async (req, res) => {
  const userId = Number(req.params.id);
  const user = await User.findById(userId);
  if (!user) throw new HttpError('Usuario no encontrado', 404);

  await User.remove(userId);
  return ok(res, { message: 'Usuario eliminado' });
});

module.exports = { createDoctor, createPatient, listUsers, assignDoctor, deleteUser };
