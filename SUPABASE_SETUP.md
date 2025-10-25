# Supabase Auth Setup Guide

This guide will help you set up Supabase authentication for ClearWallet.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: clearwallet (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project"

## 2. Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** → This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Add these to your `.env.local` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Run the Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `/supabase/schema.sql`
4. Paste into the SQL editor
5. Click "Run" to execute

This will create:
- `customers` table (linked to auth.users)
- `api_keys` table
- Row Level Security policies
- Automatic triggers for user creation

## 4. Configure Email Authentication

### Option A: Use Supabase Email (Quick Start)

1. Go to **Authentication** > **Providers** > **Email**
2. Ensure "Enable Email provider" is ON
3. Configure email templates if desired
4. **Important**: For production, configure email confirmations

### Option B: Use Custom SMTP (Production)

1. Go to **Project Settings** > **Auth** > **SMTP Settings**
2. Enable "Custom SMTP"
3. Enter your SMTP credentials:
   - Host, Port, Username, Password
4. Configure sender email

## 5. Configure Auth Settings

Go to **Authentication** > **Settings**:

### Site URL
```
https://clearwallet.app
```

### Redirect URLs
Add these allowed redirect URLs:
```
https://clearwallet.app/dashboard
https://clearwallet.app/
http://localhost:3000/dashboard (for development)
http://localhost:3000/
```

### Email Confirmation

**For Development** (optional):
- Turn OFF "Enable email confirmations"
- Users can log in immediately after signup

**For Production** (recommended):
- Keep ON "Enable email confirmations"
- Users must verify email before logging in

## 6. Test the Setup

1. Start your development server:
```bash
npm run dev
```

2. Visit `http://localhost:3000/signup`
3. Create a test account
4. Check Supabase **Authentication** > **Users** to see your new user
5. Check **Table Editor** > **customers** to see the customer record

## 7. Verify Database Tables

Go to **Table Editor** and verify these tables exist:
- `customers` - Should have your test user
- `api_keys` - Initially empty

## 8. Security Checklist

- [ ] RLS is enabled on `customers` and `api_keys` tables
- [ ] Users can only see their own data
- [ ] Email confirmation is enabled (production)
- [ ] Strong password requirements are set
- [ ] Redirect URLs are whitelisted
- [ ] API keys are stored in environment variables (not committed to git)

## Troubleshooting

### "Missing Supabase environment variables"
- Ensure `.env.local` has both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart your dev server after adding env vars

### Users can't sign up
- Check **Authentication** > **Providers** > Email is enabled
- Check browser console for errors
- Verify NEXT_PUBLIC env vars are set correctly

### Users created but not in customers table
- Check the trigger is created: **Database** > **Functions** > `handle_new_user`
- Check trigger exists on `auth.users` table
- Run the schema.sql again if missing

### RLS errors
- Verify policies exist in **Authentication** > **Policies**
- Check that auth.uid() matches the customer.id

## Next Steps

After Supabase is configured:

1. ✅ Users can sign up and log in
2. ✅ Dashboard requires authentication
3. ✅ API keys are tied to authenticated users
4. 🔜 Add Stripe billing integration
5. 🔜 Configure email templates
6. 🔜 Set up password reset flow

## Production Checklist

Before going live:
- [ ] Enable email confirmation
- [ ] Configure custom SMTP (not Supabase default)
- [ ] Customize email templates
- [ ] Set strong password requirements
- [ ] Enable MFA (optional but recommended)
- [ ] Set up monitoring/alerts
- [ ] Review and audit RLS policies
- [ ] Set proper rate limits on auth endpoints
