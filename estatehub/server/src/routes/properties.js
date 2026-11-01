const router = require('express').Router();
const c = require('../controllers/propertyController');
const { validate } = require('../middleware/validate');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const { upload, handleUploadErrors } = require('../middleware/upload');
const { createPropertySchema, updatePropertySchema, listQuerySchema } = require('../validators/propertySchemas');

// Public
router.get('/', validate(listQuerySchema, 'query'), c.list);
router.get('/locations', c.locations);

// Broker's own listings (must be before "/:id")
router.get('/mine', requireAuth, requireRole('broker'), c.mine);

router.get('/:id(\\d+)', optionalAuth, c.getOne);

// Writes: broker (or admin) only. Ownership is checked again inside the controller.
router.post('/', requireAuth, requireRole('broker'), validate(createPropertySchema), c.create);
router.patch('/:id(\\d+)', requireAuth, requireRole('broker', 'admin'), validate(updatePropertySchema), c.update);
router.delete('/:id(\\d+)', requireAuth, requireRole('broker', 'admin'), c.remove);

router.post(
  '/:id(\\d+)/images',
  requireAuth,
  requireRole('broker', 'admin'),
  upload.array('images', 8),
  handleUploadErrors,
  c.addImages
);
router.patch('/:id(\\d+)/images/:imageId(\\d+)/primary', requireAuth, requireRole('broker', 'admin'), c.setPrimaryImage);
router.delete('/:id(\\d+)/images/:imageId(\\d+)', requireAuth, requireRole('broker', 'admin'), c.removeImage);

module.exports = router;
