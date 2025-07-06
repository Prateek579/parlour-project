import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect() {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    this.socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  joinAttendanceRoom() {
    if (this.socket) {
      this.socket.emit('join-attendance');
    }
  }

  onAttendanceUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('attendance-updated', callback);
    }
  }

  offAttendanceUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.off('attendance-updated', callback);
    }
  }

  emitPunchIn(data: {
    employeeId: string;
    employeeName: string;
    time: string;
    date: string;
  }) {
    if (this.socket) {
      this.socket.emit('punch-in', data);
    }
  }

  emitPunchOut(data: {
    employeeId: string;
    employeeName: string;
    time: string;
    date: string;
    totalHours: string;
  }) {
    if (this.socket) {
      this.socket.emit('punch-out', data);
    }
  }

  getSocket() {
    return this.socket;
  }

  isSocketConnected() {
    return this.isConnected;
  }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService; 