import express from 'express';
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  hardDeleteTask,
  getTasksByEmployee
} from '../controllers/taskController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles, requireRole } from '../middlewares/roleMiddleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateJWT);

// Create a new task (Superadmin only)
router.post('/', authorizeRoles(), createTask);

// Get all tasks (Admin and Superadmin only)
router.get('/',  getAllTasks);

// Get task by ID (Admin and Superadmin only)
router.get('/:id', getTaskById);

// Update task (Superadmin only)
router.put('/:id', authorizeRoles(), updateTask);

// Soft delete task (Superadmin only)
router.delete('/:id', authorizeRoles(), deleteTask);

// Hard delete task (Superadmin only)
router.delete('/:id/permanent', authorizeRoles(), hardDeleteTask);

// Get tasks by employee ID (Admin and Superadmin only)
router.get('/employee/:employeeId', requireRole(['admin', 'superadmin']), getTasksByEmployee);

export default router; 