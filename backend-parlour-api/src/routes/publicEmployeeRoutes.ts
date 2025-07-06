import express from 'express';
import { Request, Response } from 'express';
import Employee from '../models/Employee';

const router = express.Router();

// Get all active employees (public route for attendance page)
router.get('/', async (req: Request, res: Response) => {
  try {
    const employees = await Employee.find({ isActive: true }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Active employees retrieved successfully',
      count: employees.length,
      data: employees
    });
  } catch (error) {
    console.error('Error fetching active employees:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 