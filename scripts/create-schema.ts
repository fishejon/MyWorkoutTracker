#!/usr/bin/env tsx
/**
 * Manual script to create database schema
 * Run with: npx tsx scripts/create-schema.ts
 */

import { ensureAppSchema } from '../server/db.js';

async function main() {
  console.log('Creating database schema...');
  
  try {
    await ensureAppSchema();
    console.log('✅ Schema created successfully!');
    console.log('\nTables created:');
    console.log('  - users');
    console.log('  - auth_events');
    console.log('  - user_data');
    console.log('  - workouts');
    console.log('  - rounds');
    console.log('  - exercise_sets');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating schema:', error);
    process.exit(1);
  }
}

main();
