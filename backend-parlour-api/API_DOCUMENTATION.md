# Parlour Management API Documentation

## Employee Management APIs

### Base URL
```
http://localhost:5000/api
```

### Authentication
Most endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Protected Employee Routes (Admin/Superadmin Only)

### 1. Create Employee
**POST** `/employees`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Sarah Johnson",
  "email": "sarah@parlour.com",
  "position": "Senior Stylist",
  "phone": "+1 234-567-8901",
  "joinDate": "2023-01-15",
  "avatar": "SJ"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Sarah Johnson",
    "email": "sarah@parlour.com",
    "position": "Senior Stylist",
    "phone": "+1 234-567-8901",
    "joinDate": "2023-01-15T00:00:00.000Z",
    "avatar": "SJ",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 2. Get All Employees
**GET** `/employees`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `isActive` (optional): Filter by active status (`true`/`false`)

**Example:**
```
GET /employees?isActive=true
```

**Response:**
```json
{
  "success": true,
  "message": "Employees retrieved successfully",
  "count": 3,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Sarah Johnson",
      "email": "sarah@parlour.com",
      "position": "Senior Stylist",
      "phone": "+1 234-567-8901",
      "joinDate": "2023-01-15T00:00:00.000Z",
      "avatar": "SJ",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 3. Get Employee by ID
**GET** `/employees/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Employee retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Sarah Johnson",
    "email": "sarah@parlour.com",
    "position": "Senior Stylist",
    "phone": "+1 234-567-8901",
    "joinDate": "2023-01-15T00:00:00.000Z",
    "avatar": "SJ",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 4. Update Employee
**PUT** `/employees/:id`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Sarah Johnson Updated",
  "email": "sarah.updated@parlour.com",
  "position": "Senior Stylist",
  "phone": "+1 234-567-8901",
  "joinDate": "2023-01-15",
  "avatar": "SJU",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Sarah Johnson Updated",
    "email": "sarah.updated@parlour.com",
    "position": "Senior Stylist",
    "phone": "+1 234-567-8901",
    "joinDate": "2023-01-15T00:00:00.000Z",
    "avatar": "SJU",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### 5. Soft Delete Employee
**DELETE** `/employees/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Employee deleted successfully"
}
```

---

### 6. Hard Delete Employee (Superadmin Only)
**DELETE** `/employees/:id/permanent`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Employee permanently deleted"
}
```

---

## Public Employee Routes (No Authentication Required)

### 1. Get All Active Employees (for Attendance Page)
**GET** `/public/employees`

**Response:**
```json
{
  "success": true,
  "message": "Employees retrieved successfully",
  "count": 3,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Sarah Johnson",
      "email": "sarah@parlour.com",
      "position": "Senior Stylist",
      "phone": "+1 234-567-8901",
      "joinDate": "2023-01-15T00:00:00.000Z",
      "avatar": "SJ",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## Employee Schema

```typescript
interface Employee {
  _id: string;
  name: string;           // Required
  email: string;          // Required, unique
  position: string;       // Required
  phone: string;          // Required
  joinDate: Date;         // Required, defaults to current date
  avatar: string;         // Required, auto-generated from name if not provided
  isActive: boolean;      // Defaults to true
  createdAt: Date;        // Auto-generated
  updatedAt: Date;        // Auto-generated
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Employee with this email already exists"
}
```

### 401 Unauthorized
```json
{
  "message": "No token provided"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Employee not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details"
}
```

---

## Usage Examples

### Using cURL

**Create Employee:**
```bash
curl -X POST http://localhost:5000/api/employees \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mike Chen",
    "email": "mike@parlour.com",
    "position": "Hair Colorist",
    "phone": "+1 234-567-8902",
    "joinDate": "2023-03-20"
  }'
```

**Get All Employees:**
```bash
curl -X GET http://localhost:5000/api/employees \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Get Public Employees (for attendance):**
```bash
curl -X GET http://localhost:5000/api/public/employees
```

### Using JavaScript/Fetch

**Create Employee:**
```javascript
const response = await fetch('http://localhost:5000/api/employees', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Emma Davis',
    email: 'emma@parlour.com',
    position: 'Nail Technician',
    phone: '+1 234-567-8903',
    joinDate: '2023-02-10'
  })
});

const data = await response.json();
```

**Get All Employees:**
```javascript
const response = await fetch('http://localhost:5000/api/employees', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

const data = await response.json();
``` 