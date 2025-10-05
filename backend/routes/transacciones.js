const express = require('express');
const router = express.Router();

const transaccionController = require('../controllers/transaccionController');
const auth = require('../utils/auth');
const multer = require('multer');
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		const ok = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
							 file.originalname.toLowerCase().endsWith('.xlsx');
		if (!ok) return cb(new Error('Solo se permiten archivos .xlsx'));
		cb(null, true);
	}
});

router.get('/', auth, transaccionController.getAll);
router.post('/', auth, transaccionController.create);

// Descargar plantilla Excel para importación masiva
router.get('/plantilla', auth, transaccionController.descargarPlantilla);

// Importación masiva desde Excel
router.post('/importar', auth, upload.single('file'), transaccionController.importarExcel);

// Exportación de movimientos a Excel por rango de fechas
router.get('/export', auth, transaccionController.exportarExcel);

module.exports = router;
