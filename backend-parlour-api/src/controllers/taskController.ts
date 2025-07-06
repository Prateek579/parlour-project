import { Request, Response } from 'express';
import Task, { ITask } from '../models/Task';
import Employee from '../models/Employee';
import { AuthRequest } from '../middlewares/authMiddleware';

// Create a new task
export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, assignedTo, priority, dueDate, status } = req.body;
    const createdBy = req.user?.id; // From JWT token

    // Validate required fields
    if (!title || !description || !assignedTo || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, assignedTo, and dueDate are required'
      });
    }

    // Check if assigned employee exists and is active
    const employee = await Employee.findById(assignedTo);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Assigned employee not found'
      });
    }

    if (!employee.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign task to inactive employee'
      });
    }

    // Create new task
    const task = new Task({
      title,
      description,
      assignedTo,
      priority: priority || 'medium',
      dueDate,
      status: status || 'pending',
      createdBy
    });

    const savedTask = await task.save();

    // Populate employee details for response
    const populatedTask = await Task.findById(savedTask._id)
      .populate('assignedTo', 'name email position')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: populatedTask
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get all tasks
export const getAllTasks = async (req: Request, res: Response) => {
  try {

    const tasks = await Task.find({ isActive: true }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Tasks retrieved successfully',
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get task by ID
export const getTaskById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate('assignedTo', 'name email position')
      .populate('createdBy', 'name email');
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task retrieved successfully',
      data: task
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update task
export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, assignedTo, priority, dueDate, status, isActive } = req.body;

    // Check if task exists
    const existingTask = await Task.findById(id);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // If assignedTo is being changed, validate the new employee
    if (assignedTo && assignedTo !== existingTask.assignedTo.toString()) {
      const employee = await Employee.findById(assignedTo);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Assigned employee not found'
        });
      }

      if (!employee.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Cannot assign task to inactive employee'
        });
      }
    }

    // Update task
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      {
        title,
        description,
        assignedTo,
        priority,
        dueDate,
        status,
        isActive
      },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email position')
     .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete task (soft delete)
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if task exists
    const existingTask = await Task.findById(id);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Soft delete by setting isActive to false
    await Task.findByIdAndUpdate(id, { isActive: false });

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Hard delete task (permanent removal)
export const hardDeleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if task exists
    const existingTask = await Task.findById(id);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Permanently delete task
    await Task.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Task permanently deleted'
    });
  } catch (error) {
    console.error('Error hard deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get tasks by employee ID
export const getTasksByEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { status, isActive } = req.query;

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    let query: any = { assignedTo: employeeId };
    
    if (status) {
      query.status = status;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email position')
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      message: 'Employee tasks retrieved successfully',
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching employee tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 