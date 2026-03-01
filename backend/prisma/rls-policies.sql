-- RLS Policies for Supabase
-- Apply after prisma migrate deploy
-- Run in Supabase SQL Editor or: psql $DATABASE_URL -f prisma/rls-policies.sql

-- Enable RLS on all user-scoped tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InstallmentPurchase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecurringTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Loan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditCardStatement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavingsGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SavingsContribution" ENABLE ROW LEVEL SECURITY;

-- User: own profile only
CREATE POLICY "user_own_profile" ON "User"
  FOR ALL USING (auth.uid()::text = id);

-- Account: own accounts only
CREATE POLICY "account_user_isolated" ON "Account"
  FOR ALL USING (auth.uid()::text = "userId");

-- Category: own categories only
CREATE POLICY "category_user_isolated" ON "Category"
  FOR ALL USING (auth.uid()::text = "userId");

-- Transaction: own transactions only
CREATE POLICY "transaction_user_isolated" ON "Transaction"
  FOR ALL USING (auth.uid()::text = "userId");

-- LedgerEntry: via account ownership (join through Account)
-- LedgerEntry has accountId; we need to check Account.userId
CREATE POLICY "ledger_entry_via_account" ON "LedgerEntry"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "LedgerEntry"."accountId"
      AND a."userId" = auth.uid()::text
    )
  );

-- InstallmentPurchase: own only
CREATE POLICY "installment_user_isolated" ON "InstallmentPurchase"
  FOR ALL USING (auth.uid()::text = "userId");

-- RecurringTransaction: own only
CREATE POLICY "recurring_user_isolated" ON "RecurringTransaction"
  FOR ALL USING (auth.uid()::text = "userId");

-- Loan: own only
CREATE POLICY "loan_user_isolated" ON "Loan"
  FOR ALL USING (auth.uid()::text = "userId");

-- CreditCardStatement: via account ownership
CREATE POLICY "statement_via_account" ON "CreditCardStatement"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "CreditCardStatement"."accountId"
      AND a."userId" = auth.uid()::text
    )
  );

-- AccountSnapshot: via account ownership
CREATE POLICY "snapshot_via_account" ON "AccountSnapshot"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "Account" a
      WHERE a.id = "AccountSnapshot"."accountId"
      AND a."userId" = auth.uid()::text
    )
  );

-- SavingsGoal: own only
CREATE POLICY "savings_goal_user_isolated" ON "SavingsGoal"
  FOR ALL USING (auth.uid()::text = "userId");

-- SavingsContribution: via savings goal ownership
CREATE POLICY "contribution_via_goal" ON "SavingsContribution"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "SavingsGoal" g
      WHERE g.id = "SavingsContribution"."savingsGoalId"
      AND g."userId" = auth.uid()::text
    )
  );
