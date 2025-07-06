'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import socketService from '../../lib/socket';
import Notification from '../../components/Notification';

interface Employee {
  id: string;
  name: string;
  position: string;
  avatar: string;
}

interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  punchIn: string;
  punchOut: string;
  totalHours: string;
  isActive: boolean;
}

export default function PublicAttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [currentDate] = useState(new Date().toLocaleDateString());
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const router = useRouter();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Check authentication and load data
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    
    setUser(JSON.parse(userData));
    loadEmployees();
    setLoading(false);

    // Initialize Socket.IO connection
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
      console.log('Received attendance update:', data);
      
      if (data.type === 'punch-in') {
        const newAttendance: Attendance = {
          id: Date.now().toString(),
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          date: data.date,
          punchIn: data.time,
          punchOut: '',
          totalHours: '',
          isActive: true
        };
        
            setAttendance(prev => [
      ...prev.filter(att => att.employeeId !== data.employeeId),
      newAttendance
    ]);

    // Show notification for other users
    if (user && data.employeeName !== user.name) {
      setNotification({
        message: `${data.employeeName} punched in at ${data.time}`,
        type: 'success'
      });
    }
      } else if (data.type === 'punch-out') {
        setAttendance(prev => prev.map(att => {
          if (att.employeeId === data.employeeId && att.date === data.date) {
            return {
              ...att,
              punchOut: data.time,
              totalHours: data.totalHours,
              isActive: false
            };
          }
                  return att;
      }));

      // Show notification for other users
      if (user && data.employeeName !== user.name) {
        setNotification({
          message: `${data.employeeName} punched out at ${data.time} (${data.totalHours})`,
          type: 'info'
        });
      }
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
    try {
      const response = await fetch('http://localhost:5000/api/public/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(
          (data.data || []).map((emp: any) => ({
            id: emp._id,
            name: emp.name,
            position: emp.position,
            avatar: emp.name.split(' ').map((n: string) => n[0]).join(''),
          }))
        );
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handlePunchIn = (employee: Employee) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toISOString().split('T')[0];
    
    const newAttendance: Attendance = {
      id: Date.now().toString(),
      employeeId: employee.id,
      employeeName: employee.name,
      date: dateString,
      punchIn: timeString,
      punchOut: '',
      totalHours: '',
      isActive: true
    };

    setAttendance(prev => [...prev.filter(att => att.employeeId !== employee.id), newAttendance]);

    // Emit Socket.IO event for real-time updates
    socketService.emitPunchIn({
      employeeId: employee.id,
      employeeName: employee.name,
      time: timeString,
      date: dateString
    });
  };

  const handlePunchOut = (attendanceRecord: Attendance) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Calculate total hours
    const punchInTime = new Date(`2024-01-15 ${attendanceRecord.punchIn}`);
    const punchOutTime = now;
    const diffHours = Math.round((punchOutTime.getTime() - punchInTime.getTime()) / (1000 * 60 * 60));
    const totalHours = `${diffHours}h`;
    
    setAttendance(prev => prev.map(att => {
      if (att.id === attendanceRecord.id) {
        return {
          ...att,
          punchOut: timeString,
          totalHours: totalHours,
          isActive: false
        };
      }
      return att;
    }));

    // Emit Socket.IO event for real-time updates
    socketService.emitPunchOut({
      employeeId: attendanceRecord.employeeId,
      employeeName: attendanceRecord.employeeName,
      time: timeString,
      date: attendanceRecord.date,
      totalHours: totalHours
    });
  };

  const getEmployeeAttendance = (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return attendance.find(att => att.employeeId === employeeId && att.date === today);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 p-4">
      {/* Real-time Notifications */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 bg-gradient-to-r from-pink-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg mr-4">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Attendance System
                </h1>
                <p className="text-gray-600 text-lg">Parlour Staff Management</p>
              </div>
            </div>
            
            {/* User Info and Logout */}
            {user && (
              <div className="flex justify-between items-center mb-6">
                <div className="text-left">
                  <p className="text-gray-700 font-medium">Welcome, {user.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                </div>
                <div className="flex items-center space-x-4">
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
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-2xl p-4">
                <div className="text-2xl font-bold text-gray-800">{currentDate}</div>
                <div className="text-gray-600">Today's Date</div>
              </div>
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4">
                <div className="text-2xl font-bold text-gray-800">{currentTime}</div>
                <div className="text-gray-600">Current Time</div>
              </div>
              <div className="bg-gradient-to-r from-rose-100 to-pink-100 rounded-2xl p-4">
                <div className="text-2xl font-bold text-gray-800">
                  {attendance.filter(att => att.isActive).length}
                </div>
                <div className="text-gray-600">Currently Working</div>
              </div>
            </div>
          </div>
        </div>

        {/* Employees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee) => {
            const employeeAttendance = getEmployeeAttendance(employee.id);
            const isWorking = employeeAttendance?.isActive || false;
            
            return (
              <div key={employee.id} className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-6 hover:shadow-3xl transition-all duration-300">
                <div className="text-center">
                  {/* Employee Avatar */}
                  <div className="mx-auto mb-4">
                    <div className={`h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg ${
                      isWorking 
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                        : 'bg-gradient-to-r from-gray-400 to-gray-500'
                    }`}>
                      {employee.avatar}
                    </div>
                  </div>

                  {/* Employee Info */}
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{employee.name}</h3>
                  <p className="text-gray-600 mb-4">{employee.position}</p>

                  {/* Status Indicator */}
                  <div className="mb-4">
                    <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                      isWorking 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {isWorking ? '🟢 Working' : '⚪ Not Working'}
                    </span>
                  </div>

                  {/* Attendance Info */}
                  {employeeAttendance && (
                    <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600">Punch In:</span>
                        <span className="font-medium">{employeeAttendance.punchIn}</span>
                      </div>
                      {employeeAttendance.punchOut && (
                        <>
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-600">Punch Out:</span>
                            <span className="font-medium">{employeeAttendance.punchOut}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Hours:</span>
                            <span className="font-medium text-green-600">{employeeAttendance.totalHours}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => {
                      if (isWorking && employeeAttendance) {
                        handlePunchOut(employeeAttendance);
                      } else {
                        handlePunchIn(employee);
                      }
                    }}
                    className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl ${
                      isWorking
                        ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                    }`}
                  >
                    {isWorking ? '🕐 Punch Out' : '🕐 Punch In'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            © 2024 Parlour Management System - Public Attendance Interface
          </p>
        </div>
      </div>
    </div>
  );
} 