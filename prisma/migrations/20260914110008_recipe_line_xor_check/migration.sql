-- Enforce the RecipeLine XOR constraint at the database level.
--
-- A recipe line must reference EXACTLY ONE of ingredientId / childRecipeId,
-- never both and never neither. Prisma's schema language has no way to
-- express a cross-column CHECK constraint, and SQLite's `ALTER TABLE` cannot
-- add a CHECK constraint to an existing table either — so this constraint is
-- enforced with two triggers (INSERT and UPDATE) that abort the statement
-- when the XOR does not hold. This is a deliberate, documented departure
-- from what the ORM layer alone can guarantee; application code (see
-- src/lib/recipes.ts) also validates the XOR before ever reaching SQL, so
-- these triggers are a defence-in-depth backstop, not the only guard.

CREATE TRIGGER recipe_lines_xor_insert
BEFORE INSERT ON recipe_lines
WHEN NOT (
  (NEW.ingredientId IS NOT NULL AND NEW.childRecipeId IS NULL)
  OR
  (NEW.ingredientId IS NULL AND NEW.childRecipeId IS NOT NULL)
)
BEGIN
  SELECT RAISE(ABORT, 'recipe_lines: exactly one of ingredientId or childRecipeId must be set');
END;

CREATE TRIGGER recipe_lines_xor_update
BEFORE UPDATE ON recipe_lines
WHEN NOT (
  (NEW.ingredientId IS NOT NULL AND NEW.childRecipeId IS NULL)
  OR
  (NEW.ingredientId IS NULL AND NEW.childRecipeId IS NOT NULL)
)
BEGIN
  SELECT RAISE(ABORT, 'recipe_lines: exactly one of ingredientId or childRecipeId must be set');
END;
