-- Fix replica identity for Category table
-- This allows PostgreSQL to perform delete operations on tables without primary keys
-- by using the unique constraint as the replica identity

ALTER TABLE "Category" REPLICA IDENTITY USING INDEX "Category_name_userId_type_key";
