import { Schema, model, Document, Types } from 'mongoose';

export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IProject extends Document {
  _id: Types.ObjectId;
  name: string;
  clientCompany: Types.ObjectId; // ref ClientCompany, required - exactly one
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status: ProjectStatus;
  priority: ProjectPriority;
  projectManager?: Types.ObjectId; // ref Employee
  teamMembers: Types.ObjectId[]; // ref Employee[]
  createdBy?: Types.ObjectId; // ref Employee; used for scoped access/audit
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true, index: true },
    clientCompany: { type: Schema.Types.ObjectId, ref: 'ClientCompany', required: true, index: true },
    description: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ['planned', 'active', 'on_hold', 'completed', 'cancelled'],
      default: 'planned',
      index: true,
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    projectManager: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    teamMembers: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    notes: { type: String },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

projectSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    next(new Error('End date cannot precede start date'));
    return;
  }
  next();
});

export const Project = model<IProject>('Project', projectSchema);
