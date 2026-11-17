import mongoose from 'mongoose';
import { env } from '../config/env';
import { Employee } from '../models/Employee.model';

async function repairEmployeeCodeIndex() {
  await mongoose.connect(env.mongoUri);

  // Older form versions stored the optional employeeCode as an empty string.
  // Remove those values so a sparse unique index can correctly ignore employees
  // that do not have an employee code.
  const cleanup = await Employee.collection.updateMany(
    { employeeCode: '' },
    { $unset: { employeeCode: '' } }
  );

  const indexes = await Employee.collection.indexes();
  const existing = indexes.find((index) => index.name === 'employeeCode_1');

  if (existing) {
    await Employee.collection.dropIndex('employeeCode_1');
  }

  await Employee.collection.createIndex(
    { employeeCode: 1 },
    { unique: true, sparse: true, name: 'employeeCode_1' }
  );

  console.log(`Employee code cleanup complete. Updated ${cleanup.modifiedCount} record(s).`);
  console.log('employeeCode_1 recreated as a sparse unique index.');
}

repairEmployeeCodeIndex()
  .catch((error) => {
    console.error('Failed to repair employeeCode index:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
