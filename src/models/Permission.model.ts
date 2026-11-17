import { Schema, model, Document, Types } from 'mongoose';

export type PermissionAction =
  | 'view'
  | 'view_assigned'
  | 'view_all'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'assign';

export interface IPermission extends Document {
  _id: Types.ObjectId;
  module: string; // e.g. 'employees', 'projects', 'tasks', 'leaves'
  action: PermissionAction;
  key: string; // derived: `${module}:${action}` — unique
  description?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>(
  {
    module: { type: String, required: true, trim: true, lowercase: true },
    action: {
      type: String,
      required: true,
      enum: ['view', 'view_assigned', 'view_all', 'create', 'edit', 'delete', 'approve', 'reject', 'assign'],
    },
    key: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

permissionSchema.pre('validate', function (next) {
  if (this.module && this.action) {
    this.key = `${this.module}:${this.action}`;
  }
  next();
});

export const Permission = model<IPermission>('Permission', permissionSchema);
