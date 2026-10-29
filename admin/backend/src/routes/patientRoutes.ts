import express from 'express';
import { getPatients, createPatient, getPatientById } from '../controllers/patientController';

const router = express.Router();

router.route('/')
  .get(getPatients)
  .post(createPatient);

router.route('/:id')
  .get(getPatientById as express.RequestHandler);

export default router; 