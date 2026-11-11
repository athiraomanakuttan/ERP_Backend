import { Schema, model, Document, Types } from 'mongoose';

export interface IRole extends Document {
  _id: Types.ObjectId;
  name: string; // e.g. 'Project Manager', 'Team Lead', 'Developer'
  description?: string;
  permissions: Types.ObjectId[]; // ref Permission
  isSystemRole: boolean; // true for 'Admin' - cannot be deleted/edited away from full access
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    description: { type: String },
    permissions: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
    isSystemRole: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Role = model<IRole>('Role', roleSchema);
