import mongoose, { Document, Schema } from "mongoose";

export interface IEmployee extends Document {
  name: string;
  email: string;
  position: string;
  phone: string;
  joinDate: Date;
  avatar: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  position: { 
    type: String, 
    required: true,
    trim: true
  },
  phone: { 
    type: String, 
    required: true,
    trim: true
  },
  joinDate: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

// Generate avatar from name if not provided
EmployeeSchema.pre('save', function(next) {
  if (!this.avatar) {
    const names = this.name.split(' ');
    this.avatar = names.map(name => name.charAt(0).toUpperCase()).join('');
  }
  next();
});

export default mongoose.model<IEmployee>("Employee", EmployeeSchema); 