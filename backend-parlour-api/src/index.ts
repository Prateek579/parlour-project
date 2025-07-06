import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/authRoutes";
import employeeRoutes from "./routes/employeeRoutes";
import taskRoutes from "./routes/taskRoutes";
import publicEmployeeRoutes from "./routes/publicEmployeeRoutes";
import { authenticateJWT } from "./middlewares/authMiddleware";
import { authorizeRoles } from "./middlewares/roleMiddleware";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/parlour", { useNewUrlParser: true, useUnifiedTopology: true } as any)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Join attendance room for real-time updates
  socket.on("join-attendance", () => {
    socket.join("attendance-room");
    console.log("User joined attendance room:", socket.id);
  });

  // Handle punch in
  socket.on("punch-in", (data) => {
    console.log("Punch in event:", data);
    // Broadcast to all clients in attendance room
    io.to("attendance-room").emit("attendance-updated", {
      type: "punch-in",
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      time: data.time,
      date: data.date
    });
  });

  // Handle punch out
  socket.on("punch-out", (data) => {
    console.log("Punch out event:", data);
    // Broadcast to all clients in attendance room
    io.to("attendance-room").emit("attendance-updated", {
      type: "punch-out",
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      time: data.time,
      date: data.date,
      totalHours: data.totalHours
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/public/employees", publicEmployeeRoutes);

// Example protected route
// app.get("/api/protected", authenticateJWT, authorizeRoles("admin", "superadmin"), (req, res) => {
//   res.json({ message: "You have access to this protected route!" });
// });

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export io for use in other files
export { io }; 