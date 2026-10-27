import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';

export type EmployeeStatus = 'active' | 'inactive';

export interface IEmployee extends Document {
  _id: Types.ObjectId;
  // Personal
  firstName: string;
  lastName?: string;
  dateOfBirth: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  phone: string;
  email: string;
  address: string;
  profilePhotoUrl?: string;
  profilePhotoPublicId?: string;

  // Auth
  passwordHash: string;
  isAdmin: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;

  // Employment
  employeeCode?: string;
  joiningDate: Date;
  department?: string;
  role: Types.ObjectId; // ref Role (Designation)
  branch: Types.ObjectId; // ref Branch
  reportingManager?: Types.ObjectId; // ref Employee, default Admin
  teamLead?: Types.ObjectId; // ref Employee, default Admin
  status: EmployeeStatus;

  // Other
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };

  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidate: string): Promise<boolean>;
}

const employeeSchema = new Schema<IEmployee>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    address: { type: String, required: true },
    profilePhotoUrl: { type: String },
    profilePhotoPublicId: { type: String },

    passwordHash: { type: String, required: true, select: false },
    isAdmin: { type: Boolean, default: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    employeeCode: { type: String, trim: true, sparse: true, unique: true },
    joiningDate: { type: Date, required: true },
    department: { type: String, trim: true },
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    reportingManager: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    teamLead: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },

    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relation: { type: String },
    },

    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

employeeSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, env.bcryptSaltRounds);
  next();
});

employeeSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

// Never leak passwordHash even if select() is misused
employeeSchema.set('toJSON', {
  transform: (_doc: unknown, ret: any) => {
    delete ret.passwordHash;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    return ret;
  },
});

export const Employee = model<IEmployee>('Employee', employeeSchema);
