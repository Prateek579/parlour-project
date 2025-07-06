import express from 'express';
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  hardDeleteEmployee
} from '../controllers/employeeController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles, requireRole } from '../middlewares/roleMiddleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateJWT);

// Create a new employee (Superadmin only)
router.post('/', authorizeRoles(), createEmployee);

// Get all employees (Admin and Superadmin only)
router.get('/', getAllEmployees);

// Get employee by ID (Superadmin only)
router.get('/:id', authorizeRoles(), getEmployeeById);

// Update employee (Superadmin only)
router.put('/:id', authorizeRoles(), updateEmployee);

// Soft delete employee (Superadmin only)
router.delete('/:id', authorizeRoles(), deleteEmployee);

// Hard delete employee (Superadmin only)
router.delete('/:id/permanent', authorizeRoles(), hardDeleteEmployee);

export default router; 