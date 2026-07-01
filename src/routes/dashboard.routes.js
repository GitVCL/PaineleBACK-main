// src/routes/dashboard.routes.js
import express from 'express';
import verificaToken from '../middlewares/verificaToken.js';
import { resumoDashboard, testeConexao } from '../controllers/dashboard.controller.js';

const router = express.Router();

router.get('/teste', verificaToken, testeConexao);
router.get('/', verificaToken, resumoDashboard);

export default router;
