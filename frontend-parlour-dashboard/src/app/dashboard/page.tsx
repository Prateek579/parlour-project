'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../../lib/api";
import socketService from "../../lib/socket";
import Notification from "../../components/Notification";

interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  phone: string;
  joinDate: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  punchIn: string;
  punchOut: string;
  totalHours: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<'employees' | 'tasks' | 'attendance'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [modalType, setModalType] = useState<'employee' | 'task'>('employee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const router = useRouter();

  // Fetch employees and tasks from API
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    
    const user = JSON.parse(userData);
    setUser(user);
    
    // Check if user has permission to access dashboard
    if (user.role === 'employee') {
      router.push('/attendance');
      return;
    }
    
    loadEmployees();
    loadTasks();

    // Initialize Socket.IO connection for real-time attendance updates
    const socket = socketService.connect();
    socketService.joinAttendanceRoom();

    // Update connection status
    setSocketConnected(socketService.isSocketConnected());
    
    socket.on('connect', () => {
      setSocketConnected(true);
    });
    
    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Listen for real-time attendance updates
    const handleAttendanceUpdate = (data: any) => {
      console.log('Dashboard received attendance update:', data);
      
      if (data.type === 'punch-in') {
        const newAttendance: Attendance = {
          id: Date.now().toString(),
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          date: data.date,
          punchIn: data.time,
          punchOut: '',
          totalHours: ''
        };
        
        setAttendance(prev => [
          ...prev.filter(att => att.employeeId !== data.employeeId),
          newAttendance
        ]);

        // Show notification
        setNotification({
          message: `${data.employeeName} punched in at ${data.time}`,
          type: 'success'
        });
      } else if (data.type === 'punch-out') {
        setAttendance(prev => prev.map(att => {
          if (att.employeeId === data.employeeId && att.date === data.date) {
            return {
              ...att,
              punchOut: data.time,
              totalHours: data.totalHours
            };
          }
          return att;
        }));

        // Show notification
        setNotification({
          message: `${data.employeeName} punched out at ${data.time} (${data.totalHours})`,
          type: 'info'
        });
      }
    };

    socketService.onAttendanceUpdate(handleAttendanceUpdate);

    // Cleanup on unmount
    return () => {
      socketService.offAttendanceUpdate(handleAttendanceUpdate);
      socketService.disconnect();
    };
  }, [router]);

  const loadEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEmployees();
      setEmployees(
        (res.data || res.employees || []).map((emp: any) => ({
          id: emp._id,
          name: emp.name,
          email: emp.email,
          position: emp.position,
          phone: emp.phone,
          joinDate: emp.joinDate ? emp.joinDate.slice(0, 10) : "",
        }))
      );
    } catch (err: any) {
      setError(err.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTasks();
      setTasks(
        (res.data || res.tasks || []).map((task: any) => ({
          id: task._id,
          title: task.title,
          description: task.description,
          assignedTo: task.assignedTo?.name || task.assignedTo,
          status: task.status,
          dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
          priority: task.priority,
        }))
      );
    } catch (err: any) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleAdd = (type: 'employee' | 'task') => {
    setModalType(type);
    setEditingItem(null);
    setShowAddModal(true);
  };

  const handleEdit = (item: any, type: 'employee' | 'task') => {
    setModalType(type);
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleDelete = async (id: string, type: 'employee' | 'task') => {
    if (confirm('Are you sure you want to delete this item?')) {
      setLoading(true);
      setError(null);
      try {
        if (type === 'employee') {
          await deleteEmployee(id);
          await loadEmployees();
        } else {
          await deleteTask(id);
          await loadTasks();
        }
      } catch (err: any) {
        setError(err.message || "Delete failed");
      } finally {
        setLoading(false);
      }
    }
  };

  // Add/Edit Modal submit handlers
  const handleModalSubmit = async (form: any) => {
    setLoading(true);
    setError(null);
    try {
      if (modalType === 'employee') {
        if (editingItem) {
          await updateEmployee(editingItem.id, form);
        } else {
          await createEmployee(form);
        }
        await loadEmployees();
      } else {
        // For tasks, assignedTo should be employee id
        const taskPayload = {
          ...form,
          assignedTo: employees.find((e) => e.name === form.assignedTo)?.id || form.assignedTo,
        };
        if (editingItem) {
          await updateTask(editingItem.id, taskPayload);
        } else {
          await createTask(taskPayload);
        }
        await loadTasks();
      }
      setShowAddModal(false);
      setShowEditModal(false);
    } catch (err: any) {
      setError(err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePunchIn = (employeeId: string) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toISOString().split('T')[0];
    
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
      const newAttendance: Attendance = {
        id: Date.now().toString(),
        employeeId,
        employeeName: employee.name,
        date: dateString,
        punchIn: timeString,
        punchOut: '',
        totalHours: ''
      };
      setAttendance([...attendance, newAttendance]);
    }
  };

  const handlePunchOut = (attendanceId: string) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    setAttendance(attendance.map(att => {
      if (att.id === attendanceId) {
        const punchInTime = new Date(`2024-01-15 ${att.punchIn}`);
        const punchOutTime = now;
        const diffHours = Math.round((punchOutTime.getTime() - punchInTime.getTime()) / (1000 * 60 * 60));
        
        return {
          ...att,
          punchOut: timeString,
          totalHours: `${diffHours}h`
        };
      }
      return att;
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Additional check to prevent employee access
  if (user.role === 'employee') {
    router.push('/attendance');
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50">
      {/* Real-time Notifications */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-pink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-gradient-to-r from-pink-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="ml-4 text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Parlour Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 font-medium">Welcome, {user.name}</span>
              <span className="px-3 py-1 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800 rounded-full text-sm font-medium">
                {user.role}
              </span>
              {/* Socket Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {socketConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition duration-200 shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-2">
          <div className="flex space-x-2">
            {[
              { key: 'employees', label: 'Employees', icon: '👥' },
              { key: 'tasks', label: 'Tasks', icon: '📋' },
              { key: 'attendance', label: 'Attendance', icon: '⏰' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSection(tab.key as any)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                  activeSection === tab.key
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Employees Section */}
        {activeSection === 'employees' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-900">Employees Management</h2>
              {user?.role === 'superadmin' && (
                <button
                  onClick={() => handleAdd('employee')}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition duration-200 shadow-lg"
                >
                  + Add Employee
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading employees...</p>
                </div>
              ) : error ? (
                <div className="col-span-full text-center py-12 text-red-600">
                  {error}
                </div>
              ) : employees.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No employees found. Add one to get started!
                </div>
              ) : (
                employees.map((employee) => (
                  <div key={employee.id} className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 bg-gradient-to-r from-pink-400 to-purple-500 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                                          {user?.role === 'superadmin' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(employee, 'employee')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id, 'employee')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{employee.name}</h3>
                    <p className="text-gray-600 mb-1">{employee.position}</p>
                    <p className="text-gray-500 text-sm mb-1">{employee.email}</p>
                    <p className="text-gray-500 text-sm mb-3">{employee.phone}</p>
                    <div className="text-xs text-gray-400">Joined: {employee.joinDate}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tasks Section */}
        {activeSection === 'tasks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-900">Task Management</h2>
              {user?.role === 'superadmin' && (
                <button
                  onClick={() => handleAdd('task')}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition duration-200 shadow-lg"
                >
                  + Assign Task
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading tasks...</p>
                </div>
              ) : error ? (
                <div className="col-span-full text-center py-12 text-red-600">
                  {error}
                </div>
              ) : tasks.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No tasks found. Assign one to get started!
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.priority.toUpperCase()}
                      </div>
                                          {user?.role === 'superadmin' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(task, 'task')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(task.id, 'task')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{task.title}</h3>
                    <p className="text-gray-600 mb-3">{task.description}</p>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Assigned to: <span className="font-medium">{task.assignedTo}</span></p>
                      <p className="text-sm text-gray-500">Due: <span className="font-medium">{task.dueDate}</span></p>
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status.replace('-', ' ').toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Attendance Section */}
        {activeSection === 'attendance' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Attendance Management</h2>
                <p className="text-sm text-gray-500 mt-1">View-only mode for management</p>
              </div>
              <div className="text-sm text-gray-600">
                Today: {new Date().toLocaleDateString()}
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {employees.map((employee) => {
                  const todayAttendance = attendance.find(att => 
                    att.employeeId === employee.id && att.date === new Date().toISOString().split('T')[0]
                  );
                  
                  return (
                    <div key={employee.id} className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-6 border border-pink-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 bg-gradient-to-r from-pink-400 to-purple-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold">
                            {employee.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">{employee.position}</p>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{employee.name}</h3>
                      
                      {todayAttendance ? (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Punch In:</span>
                            <span className="font-medium">{todayAttendance.punchIn}</span>
                          </div>
                          {todayAttendance.punchOut && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Punch Out:</span>
                                <span className="font-medium">{todayAttendance.punchOut}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Total Hours:</span>
                                <span className="font-medium text-green-600">{todayAttendance.totalHours}</span>
                              </div>
                            </>
                          )}
                          {!todayAttendance.punchOut && (
                            <div className="text-center py-2">
                              <span className="text-sm text-green-600 font-medium">🟢 Currently Working</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <span className="text-sm text-gray-500">⚪ Not Punched In</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {showAddModal ? `Add ${modalType === 'employee' ? 'Employee' : 'Task'}` : `Edit ${modalType === 'employee' ? 'Employee' : 'Task'}`}
            </h3>
            
            {modalType === 'employee' ? (
              <form 
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const employeeData = {
                    name: formData.get('name') as string,
                    email: formData.get('email') as string,
                    position: formData.get('position') as string,
                    phone: formData.get('phone') as string,
                    joinDate: formData.get('joinDate') as string || new Date().toISOString().split('T')[0],
                  };
                  handleModalSubmit(employeeData);
                }}
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    name="name"
                    type="text"
                    defaultValue={editingItem?.name || ''}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Enter employee name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={editingItem?.email || ''}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                  <input
                    name="position"
                    type="text"
                    defaultValue={editingItem?.position || ''}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Enter position"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={editingItem?.phone || ''}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Join Date</label>
                  <input
                    name="joinDate"
                    type="date"
                    defaultValue={editingItem?.joinDate || new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                    }}
                    className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition duration-200 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : (showAddModal ? 'Add' : 'Update')}
                  </button>
                </div>
              </form>
            ) : (
              <form 
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const taskData = {
                    title: formData.get('title') as string,
                    description: formData.get('description') as string,
                    assignedTo: formData.get('assignedTo') as string,
                    priority: formData.get('priority') as string,
                    dueDate: formData.get('dueDate') as string,
                    status: formData.get('status') as string || 'pending',
                  };
                  handleModalSubmit(taskData);
                }}
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    name="title"
                    type="text"
                    defaultValue={editingItem?.title || ''}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    defaultValue={editingItem?.description || ''}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                  <select 
                    name="assignedTo"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="">Select an employee</option>
                    {employees.map(emp => (
                      <option 
                        key={emp.id} 
                        value={emp.name}
                        selected={editingItem?.assignedTo === emp.name}
                      >
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select 
                    name="priority"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="low" selected={editingItem?.priority === 'low'}>Low</option>
                    <option value="medium" selected={editingItem?.priority === 'medium'}>Medium</option>
                    <option value="high" selected={editingItem?.priority === 'high'}>High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select 
                    name="status"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="pending" selected={editingItem?.status === 'pending'}>Pending</option>
                    <option value="in-progress" selected={editingItem?.status === 'in-progress'}>In Progress</option>
                    <option value="completed" selected={editingItem?.status === 'completed'}>Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={editingItem?.dueDate || ''}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                    }}
                    className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition duration-200 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : (showAddModal ? 'Add' : 'Update')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 